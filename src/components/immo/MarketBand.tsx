"use client";

import { useEffect, useState } from "react";
import { formatAriary } from "@/lib/format";
import Ico from "./Ico";

type Summary = {
  fokontany: string;
  txn: "sale" | "rent" | null;
  medianPricePerSqm: number | null;
  sampleSize: number;
  trendPct: number | null;
};

/**
 * Neighborhood market band: median price/m² + sample size (+ 30-day trend when
 * available). Renders nothing until a fokontany with data is known (PRODUCT §7).
 */
export default function MarketBand({
  fokontany,
  txn,
}: {
  fokontany?: string;
  txn?: "sale" | "rent";
}) {
  const [data, setData] = useState<Summary | null>(null);

  useEffect(() => {
    if (!fokontany) {
      setData(null);
      return;
    }
    const params = new URLSearchParams({ fokontany });
    if (txn) params.set("txn", txn);
    const ac = new AbortController();
    fetch(`/api/market/summary?${params}`, { signal: ac.signal })
      .then((r) => r.json())
      .then((d: Summary) => setData(d))
      .catch(() => {});
    return () => ac.abort();
  }, [fokontany, txn]);

  if (!data || data.medianPricePerSqm == null || data.sampleSize === 0)
    return null;

  const trendUp = (data.trendPct ?? 0) > 0;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl border border-gold-soft bg-gold-tint/50 px-4 py-2.5 text-sm">
      <span className="inline-flex items-center gap-1.5 font-semibold text-navy">
        <Ico name="pin" size={14} /> Marché à {data.fokontany}
      </span>
      <span className="tnum text-ink">
        médiane{" "}
        <strong className="font-display">
          {formatAriary(Math.round(data.medianPricePerSqm))}/m²
        </strong>
      </span>
      <span className="text-muted">· {data.sampleSize} biens</span>
      {data.trendPct != null && data.trendPct !== 0 && (
        <span
          className={`tnum inline-flex items-center gap-0.5 font-medium ${
            trendUp ? "text-absent" : "text-present"
          }`}
        >
          {trendUp ? "▲" : "▼"} {Math.abs(data.trendPct)}% / 30j
        </span>
      )}
    </div>
  );
}
