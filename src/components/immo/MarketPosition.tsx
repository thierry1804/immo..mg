"use client";

import { useEffect, useState } from "react";
import { formatAriary } from "@/lib/format";

type Summary = {
  medianPricePerSqm: number | null;
  sampleSize: number;
};

export default function MarketPosition({
  fokontany,
  txn,
  pricePerSqm,
}: {
  fokontany: string | null;
  txn: "sale" | "rent";
  pricePerSqm: number | null;
}) {
  const [market, setMarket] = useState<Summary | null>(null);

  useEffect(() => {
    if (!fokontany || pricePerSqm == null) {
      setMarket(null);
      return;
    }
    const params = new URLSearchParams({ fokontany, txn });
    fetch(`/api/market/summary?${params}`)
      .then((r) => r.json())
      .then((d: Summary) => setMarket(d))
      .catch(() => setMarket(null));
  }, [fokontany, txn, pricePerSqm]);

  if (!market?.medianPricePerSqm || pricePerSqm == null) return null;

  const median = market.medianPricePerSqm;
  const ratio = pricePerSqm / median;
  const label =
    ratio < 0.92
      ? "Sous la médiane du quartier"
      : ratio > 1.08
        ? "Au-dessus de la médiane"
        : "Dans la médiane du quartier";
  const pct = Math.round(Math.abs(ratio - 1) * 100);
  const width = Math.min(100, Math.max(8, Math.round(ratio * 50)));

  return (
    <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
      <h3 className="font-display text-base font-semibold text-navy">
        vs marché — {fokontany}
      </h3>
      <p className="mt-1 text-sm font-medium text-ink">{label}</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-paper-2">
        <div
          className="h-full rounded-full bg-gold transition-all"
          style={{ width: `${width}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-muted">
        Médiane {formatAriary(Math.round(median))}/m² · écart ~{pct}% ·{" "}
        {market.sampleSize} biens
      </p>
    </div>
  );
}
