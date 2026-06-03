"use client";

import { useEffect, useState } from "react";
import { formatAriary } from "@/lib/format";
import Ico from "./Ico";

type Neighborhood = {
  fokontany: string;
  medianPricePerSqm: number | null;
  sampleSize: number;
  trendPct: number | null;
};

export default function MarketCarousel({
  txn,
  selected,
  onSelect,
}: {
  txn?: "sale" | "rent";
  selected?: string;
  onSelect: (fokontany: string) => void;
}) {
  const [items, setItems] = useState<Neighborhood[]>([]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (txn) params.set("txn", txn);
    fetch(`/api/market/batch?${params}`)
      .then((r) => r.json())
      .then((d: { neighborhoods: Neighborhood[] }) =>
        setItems(d.neighborhoods ?? []),
      )
      .catch(() => setItems([]));
  }, [txn]);

  if (items.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
      {items.map((n) => {
        const active = selected === n.fokontany;
        const trendUp = (n.trendPct ?? 0) > 0;
        return (
          <button
            key={n.fokontany}
            type="button"
            onClick={() => onSelect(n.fokontany)}
            className={`focus-gold shrink-0 rounded-2xl border px-4 py-2.5 text-left text-sm transition ${
              active
                ? "border-gold bg-gold-tint shadow-card"
                : "border-line bg-white hover:border-navy-300"
            }`}
          >
            <span className="flex items-center gap-1 font-semibold text-navy">
              <Ico name="pin" size={13} /> {n.fokontany}
            </span>
            {n.medianPricePerSqm != null && (
              <span className="tnum mt-0.5 block text-xs text-ink">
                {formatAriary(Math.round(n.medianPricePerSqm))}/m²
              </span>
            )}
            <span className="text-[10px] text-muted">
              {n.sampleSize} biens
              {n.trendPct != null && n.trendPct !== 0 && (
                <span className={trendUp ? "text-absent" : "text-present"}>
                  {" "}
                  · {trendUp ? "▲" : "▼"}
                  {Math.abs(n.trendPct)}%
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
