import { and, eq, gte, isNotNull, lt, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { listings } from "@/db/schema";

/**
 * Market summary for a neighborhood (PRODUCT §7): median price/m² and sample
 * size, plus a 30-day trend when there's enough recent data. Drives MarketBand.
 *
 *   GET /api/market/summary?fokontany=Ivandry&txn=rent
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const fokontany = url.searchParams.get("fokontany");
  const txn = url.searchParams.get("txn");
  if (!fokontany) {
    return NextResponse.json({ error: "fokontany required" }, { status: 400 });
  }

  const base = [
    eq(listings.status, "active"),
    eq(listings.fokontany, fokontany),
    isNotNull(listings.pricePerSqm),
  ];
  if (txn === "sale" || txn === "rent")
    base.push(eq(listings.transactionType, txn));

  const median = (extra = base) =>
    db
      .select({
        m: sql<
          number | null
        >`percentile_cont(0.5) within group (order by ${listings.pricePerSqm})`,
        n: sql<number>`count(*)::int`,
      })
      .from(listings)
      .where(and(...extra));

  const [overall] = await median();

  // 30-day trend: median of the last 30 days vs the prior 30 days.
  const d30 = sql`now() - interval '30 days'`;
  const d60 = sql`now() - interval '60 days'`;
  const seen = listings.lastSeenAt;
  const [recent] = await median([...base, gte(seen, d30 as never)]);
  const [prior] = await median([
    ...base,
    gte(seen, d60 as never),
    lt(seen, d30 as never),
  ]);

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

  return NextResponse.json({
    fokontany,
    txn: txn === "sale" || txn === "rent" ? txn : null,
    medianPricePerSqm: overall?.m ?? null,
    sampleSize: overall?.n ?? 0,
    trendPct,
  });
}
