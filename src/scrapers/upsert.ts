import { and, eq, sql } from "drizzle-orm";
import { computeConfidence } from "@/lib/confidence";
import { estimateRealCost } from "@/lib/real-cost";
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

    // Append source to canonical if a duplicate was detected
    if (canonical) {
      await db
        .update(listings)
        .set({
          sources: sql`${listings.sources} || ${JSON.stringify([{ source: n.source, url: n.externalUrl }])}::jsonb`,
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
