/**
 * Backfill immo·mg enrichment onto listings that predate the M2 pipeline:
 * amenities, fokontany, price/m², real-cost, single-source `sources`, and the
 * explainable confidence score. Pure-lib derived (no network), idempotent —
 * safe to re-run. Spatial dedup (canonical_id) is left to the scrape upsert.
 *
 *   npm run db:backfill   (tsx --env-file=.env.local scripts/backfill-enrichment.ts)
 */
import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { listingPhotos, listings, propertyDetails } from "@/db/schema";
import { extractAmenities } from "@/lib/amenities";
import { computeConfidence } from "@/lib/confidence";
import { resolveFokontany } from "@/lib/fokontany";
import { estimateRealCost } from "@/lib/real-cost";
import { pricePerSqm } from "@/scrapers/enrich";

function daysSince(d: Date | null): number {
  if (!d) return 9999;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 86_400_000));
}

async function main() {
  const rows = await db
    .select({
      id: listings.id,
      title: listings.title,
      description: listings.description,
      transactionType: listings.transactionType,
      price: listings.price,
      source: listings.source,
      externalUrl: listings.externalUrl,
      sources: listings.sources,
      scrapedAt: listings.scrapedAt,
      createdAt: listings.createdAt,
      lng: sql<number>`ST_X(${listings.location}::geometry)`,
      lat: sql<number>`ST_Y(${listings.location}::geometry)`,
      surfaceM2: propertyDetails.surfaceM2,
      photoCount: sql<number>`(select count(*)::int from ${listingPhotos} p where p.listing_id = ${listings.id})`,
    })
    .from(listings)
    .innerJoin(propertyDetails, eq(propertyDetails.listingId, listings.id));

  // Pass 1: resolve fokontany + amenities in memory, gather prices per
  // (fokontany, txn) so confidence's price-coherence check has a real median.
  const enriched = rows.map((r) => ({
    ...r,
    fokontany: resolveFokontany(r.lng, r.lat),
    amenities: extractAmenities(`${r.title} ${r.description}`),
  }));

  const buckets = new Map<string, number[]>();
  for (const r of enriched) {
    if (!r.fokontany) continue;
    const k = `${r.fokontany}|${r.transactionType}`;
    (buckets.get(k) ?? buckets.set(k, []).get(k)!).push(r.price);
  }
  const median = (k: string): number | null => {
    const xs = buckets.get(k);
    if (!xs || xs.length === 0) return null;
    const s = [...xs].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };

  let updated = 0;
  for (const r of enriched) {
    const sources =
      r.sources && r.sources.length > 0
        ? r.sources
        : [{ source: r.source, url: r.externalUrl }];
    const realCost = estimateRealCost({
      price: r.price,
      transactionType: r.transactionType,
      surfaceM2: r.surfaceM2,
      amenities: r.amenities,
    });
    const { score, breakdown } = computeConfidence({
      photoCount: r.photoCount,
      surfaceM2: r.surfaceM2,
      fokontany: r.fokontany,
      ageDays: daysSince(r.scrapedAt ?? r.createdAt),
      price: r.price,
      neighborhoodMedianPrice: r.fokontany
        ? median(`${r.fokontany}|${r.transactionType}`)
        : null,
      sourceCount: sources.length,
    });

    await db
      .update(listings)
      .set({
        fokontany: r.fokontany,
        amenities: r.amenities,
        pricePerSqm: pricePerSqm(r.price, r.surfaceM2),
        estimatedRealCost: realCost?.total ?? null,
        confidenceScore: score,
        confidenceBreakdown: breakdown,
        sources,
        lastSeenAt: r.scrapedAt ?? r.createdAt,
      })
      .where(eq(listings.id, r.id));
    updated++;
  }

  console.log(
    `Backfilled ${updated} listings (${buckets.size} fokontany/txn price buckets).`,
  );
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
