import { and, eq, sql } from "drizzle-orm";
import {
  computeConfidence,
  markConfidenceCheck,
  scoreFromBreakdown,
  type ConfidenceCheck,
} from "@/lib/confidence";
import { estimateRealCost } from "@/lib/real-cost";
import { embeddingColumns } from "@/lib/llm/embeddings";
import { db } from "@/db/client";
import { listingPhotos, listings, propertyDetails } from "@/db/schema";
import { isLikelyDuplicate, pricePerSqm } from "./enrich";
import type { NormalizedListing } from "./types";

export type UpsertOutcome = "inserted" | "updated" | "unchanged";

async function neighborhoodMedian(
  fokontany: string | null,
  txn: "sale" | "rent",
): Promise<number | null> {
  if (!fokontany) return null;
  const r = await db
    .select({
      median: sql<number | null>`percentile_cont(0.5) within group (order by ${listings.price})`,
    })
    .from(listings)
    .where(
      and(eq(listings.fokontany, fokontany), eq(listings.transactionType, txn)),
    );
  return r[0]?.median ?? null;
}

export async function upsertScrapedListing(
  n: NormalizedListing,
): Promise<UpsertOutcome> {
  const existing = await db
    .select({
      id: listings.id,
      rawHash: listings.rawHash,
      sources: listings.sources,
      title: listings.title,
      description: listings.description,
      amenities: listings.amenities,
    })
    .from(listings)
    .where(
      and(eq(listings.source, n.source), eq(listings.externalId, n.externalId)),
    )
    .limit(1);

  if (existing.length === 0) {
    // Find a spatial dedup candidate
    const nearby = await db
      .select({
        id: listings.id,
        transactionType: listings.transactionType,
        price: listings.price,
        surfaceM2: propertyDetails.surfaceM2,
        sources: listings.sources,
        confidenceBreakdown: listings.confidenceBreakdown,
      })
      .from(listings)
      .innerJoin(propertyDetails, eq(propertyDetails.listingId, listings.id))
      .where(
        and(
          eq(listings.isDuplicate, false),
          sql`ST_DWithin(${listings.location}, ST_SetSRID(ST_MakePoint(${n.lng}, ${n.lat}), 4326)::geography, 150)`,
        ),
      );

    const canonical = nearby.find((c) =>
      isLikelyDuplicate(
        { transactionType: c.transactionType, price: c.price, surfaceM2: c.surfaceM2 },
        { transactionType: n.transactionType, price: n.price, surfaceM2: n.surfaceM2 },
      ),
    );

    const sourceCount = canonical ? (canonical.sources?.length ?? 1) + 1 : 1;
    const median = await neighborhoodMedian(n.fokontany, n.transactionType);
    const { score, breakdown } = computeConfidence({
      photoCount: n.imageUrls.length,
      surfaceM2: n.surfaceM2,
      fokontany: n.fokontany,
      ageDays: 0,
      price: n.price,
      neighborhoodMedianPrice: median,
      sourceCount,
    });
    const realCost = estimateRealCost({
      price: n.price,
      transactionType: n.transactionType,
      surfaceM2: n.surfaceM2,
      amenities: n.amenities,
    });

    const id = crypto.randomUUID();
    const embCols = await embeddingColumns({
      title: n.title,
      description: n.description,
      amenities: n.amenities,
    });
    await db.transaction(async (tx) => {
      await tx.insert(listings).values({
        id,
        userId: null,
        title: n.title,
        description: n.description,
        transactionType: n.transactionType,
        propertyType: n.propertyType,
        price: n.price,
        address: n.address,
        location: { lng: n.lng, lat: n.lat },
        status: "pending_review",
        source: n.source,
        externalUrl: n.externalUrl,
        externalId: n.externalId,
        scrapedAt: new Date(),
        rawHash: n.rawHash,
        fokontany: n.fokontany,
        amenities: n.amenities,
        confidenceScore: score,
        confidenceBreakdown: breakdown,
        pricePerSqm: pricePerSqm(n.price, n.surfaceM2),
        estimatedRealCost: realCost?.total ?? null,
        canonicalId: canonical ? canonical.id : null,
        isDuplicate: canonical ? true : false,
        sources: [{ source: n.source, url: n.externalUrl }],
        lastSeenAt: new Date(),
        ...embCols,
      });
      await tx.insert(propertyDetails).values({
        listingId: id,
        surfaceM2: n.surfaceM2,
        rooms: n.rooms,
        bedrooms: null,
        bathrooms: null,
      });
      if (n.imageUrls.length > 0) {
        await tx.insert(listingPhotos).values(
          n.imageUrls.map((url, i) => ({
            id: crypto.randomUUID(),
            listingId: id,
            path: url,
            displayOrder: i,
          })),
        );
      }
    });

    // Append source to canonical if a duplicate was detected. Linking a new
    // source also earns the canonical its multi-source confidence credit, so
    // recompute its score from the existing breakdown (only `multiSource`
    // changed — flipping that one check and re-summing is exact).
    if (canonical) {
      const breakdown = (canonical.confidenceBreakdown ??
        []) as ConfidenceCheck[];
      const upgraded = markConfidenceCheck(breakdown, "multiSource");
      await db
        .update(listings)
        .set({
          sources: sql`${listings.sources} || ${JSON.stringify([{ source: n.source, url: n.externalUrl }])}::jsonb`,
          ...(breakdown.length > 0
            ? {
                confidenceBreakdown: upgraded,
                confidenceScore: scoreFromBreakdown(upgraded),
              }
            : {}),
        })
        .where(eq(listings.id, canonical.id));
    }

    return "inserted";
  }

  const current = existing[0];
  if (current.rawHash === n.rawHash) return "unchanged";

  // Recompute enrichment for updated listing
  const sourceCount = current.sources?.length ?? 1;
  const median = await neighborhoodMedian(n.fokontany, n.transactionType);
  const { score, breakdown } = computeConfidence({
    photoCount: n.imageUrls.length,
    surfaceM2: n.surfaceM2,
    fokontany: n.fokontany,
    ageDays: 0,
    price: n.price,
    neighborhoodMedianPrice: median,
    sourceCount,
  });
  const realCost = estimateRealCost({
    price: n.price,
    transactionType: n.transactionType,
    surfaceM2: n.surfaceM2,
    amenities: n.amenities,
  });

  // Re-embed seulement si le contenu textuel a changé (le rawHash couvre aussi
  // prix/adresse/photos) : évite un appel embeddings inutile sur un simple
  // changement de prix. Spread {} = embedding existant conservé.
  const textChanged =
    current.title !== n.title ||
    current.description !== n.description ||
    JSON.stringify(current.amenities) !== JSON.stringify(n.amenities);
  const embCols = textChanged
    ? await embeddingColumns({
        title: n.title,
        description: n.description,
        amenities: n.amenities,
      })
    : {};

  await db.transaction(async (tx) => {
    await tx
      .update(listings)
      .set({
        title: n.title,
        description: n.description,
        price: n.price,
        address: n.address,
        location: { lng: n.lng, lat: n.lat },
        rawHash: n.rawHash,
        scrapedAt: new Date(),
        fokontany: n.fokontany,
        amenities: n.amenities,
        pricePerSqm: pricePerSqm(n.price, n.surfaceM2),
        estimatedRealCost: realCost?.total ?? null,
        confidenceScore: score,
        confidenceBreakdown: breakdown,
        lastSeenAt: new Date(),
        ...embCols,
      })
      .where(eq(listings.id, current.id));
    await tx
      .update(propertyDetails)
      .set({ surfaceM2: n.surfaceM2, rooms: n.rooms })
      .where(eq(propertyDetails.listingId, current.id));
    await tx
      .delete(listingPhotos)
      .where(eq(listingPhotos.listingId, current.id));
    if (n.imageUrls.length > 0) {
      await tx.insert(listingPhotos).values(
        n.imageUrls.map((url, i) => ({
          id: crypto.randomUUID(),
          listingId: current.id,
          path: url,
          displayOrder: i,
        })),
      );
    }
  });
  return "updated";
}
