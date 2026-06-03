import { and, eq, gte, isNotNull, lt, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { listings } from "@/db/schema";
import { FOKONTANY } from "@/lib/fokontany";

/**
 * Batch market summaries for the home carousel and map choropleth.
 * GET /api/market/batch?txn=rent
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const txn = url.searchParams.get("txn");
  const txnFilter =
    txn === "sale" || txn === "rent"
      ? eq(listings.transactionType, txn)
      : undefined;

  const results = await Promise.all(
    FOKONTANY.map(async (f) => {
      const base = [
        eq(listings.status, "active"),
        eq(listings.fokontany, f.name),
        isNotNull(listings.pricePerSqm),
      ];
      if (txnFilter) base.push(txnFilter);

      const [overall] = await db
        .select({
          m: sql<
            number | null
          >`percentile_cont(0.5) within group (order by ${listings.pricePerSqm})`,
          n: sql<number>`count(*)::int`,
        })
        .from(listings)
        .where(and(...base));

      const d30 = sql`now() - interval '30 days'`;
      const d60 = sql`now() - interval '60 days'`;
      const seen = listings.lastSeenAt;
      const [recent] = await db
        .select({
          m: sql<
            number | null
          >`percentile_cont(0.5) within group (order by ${listings.pricePerSqm})`,
          n: sql<number>`count(*)::int`,
        })
        .from(listings)
        .where(and(...base, gte(seen, d30 as never)));
      const [prior] = await db
        .select({
          m: sql<
            number | null
          >`percentile_cont(0.5) within group (order by ${listings.pricePerSqm})`,
          n: sql<number>`count(*)::int`,
        })
        .from(listings)
        .where(and(...base, gte(seen, d60 as never), lt(seen, d30 as never)));

      let trendPct: number | null = null;
      if (
        recent?.m != null &&
        prior?.m != null &&
        prior.m > 0 &&
        recent.n >= 3 &&
        prior.n >= 3
      ) {
        trendPct = Math.round(((recent.m - prior.m) / prior.m) * 100);
      }

      return {
        fokontany: f.name,
        lng: f.lng,
        lat: f.lat,
        medianPricePerSqm: overall?.m ?? null,
        sampleSize: overall?.n ?? 0,
        trendPct,
      };
    }),
  );

  return NextResponse.json({
    txn: txn === "sale" || txn === "rent" ? txn : null,
    neighborhoods: results.filter((r) => r.sampleSize > 0),
  });
}
