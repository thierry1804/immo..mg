"use client";

import { useState } from "react";
import type { ListingDetail } from "@/lib/listing-detail";
import { buildListingInsight } from "@/lib/listing-insight";
import {
  formatLastSeen,
  shareListing,
  whatsAppVisitUrl,
} from "@/lib/visit-share";
import CompatibilityRing from "./CompatibilityRing";
import ConfidenceBar from "./ConfidenceBar";
import Ico from "./Ico";
import MarketPosition from "./MarketPosition";
import RealCostEstimator from "./RealCostEstimator";

const SOURCE_LABEL: Record<string, string> = {
  user: "Annonce directe",
  coinafrique: "CoinAfrique",
  ofim: "OFIM",
  acropole: "Acropole Immo",
  etrano: "e-trano",
  facebook: "Facebook",
};

export default function ListingDetailSidebar({
  listing,
  listingUrl,
  onReport,
}: {
  listing: ListingDetail;
  listingUrl: string;
  onReport?: () => void;
}) {
  const [shareOk, setShareOk] = useState(false);
  const lastSeen = formatLastSeen(listing.lastSeenAt);
  const insight = buildListingInsight({
    title: listing.title,
    fokontany: listing.fokontany,
    pricePerSqm: listing.pricePerSqm,
    medianPricePerSqm: null,
    compatibility: listing.compatibility,
    realCost: listing.realCost,
    mustHave: [],
    amenities: listing.amenities,
  });
  const waUrl = whatsAppVisitUrl({
    title: listing.title,
    price: listing.price,
    transactionType: listing.transactionType,
    listingUrl,
  });

  return (
    <aside className="space-y-4">
      {lastSeen && (
        <p className="flex items-center gap-1 text-xs text-muted">
          <Ico name="clock" size={13} /> {lastSeen}
        </p>
      )}

      {listing.compatibility && (
        <div className="rounded-2xl border border-gold-soft bg-gold-tint/40 p-4 shadow-card">
          <div className="flex items-center gap-4">
            <CompatibilityRing score={listing.compatibility.score} size={76} />
            <div>
              <h3 className="font-display text-base font-semibold text-navy">
                Votre compatibilité
              </h3>
              <p className="text-xs text-ink-2">selon vos préférences déclarées</p>
            </div>
          </div>
          <p className="mt-3 text-sm leading-snug text-ink-2">{insight}</p>
          <ul className="mt-3 space-y-1.5 text-xs">
            {listing.compatibility.breakdown.map((b) => (
              <li key={b.key} className="flex items-center justify-between">
                <span className="text-ink-2">{b.label}</span>
                <span className="tnum text-muted">{Math.round(b.match * 100)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <MarketPosition
        fokontany={listing.fokontany}
        txn={listing.transactionType}
        pricePerSqm={listing.pricePerSqm}
      />

      {listing.confidenceScore != null && (
        <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
          <ConfidenceBar
            score={listing.confidenceScore}
            breakdown={listing.confidenceBreakdown}
          />
        </div>
      )}

      {listing.realCost && <RealCostEstimator cost={listing.realCost} />}

      {listing.sources.length > 0 && (
        <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
          <h3 className="flex items-center gap-1.5 font-display text-base font-semibold text-navy">
            <Ico name="layers" size={16} />
            {listing.sources.length > 1
              ? `Vu sur ${listing.sources.length} plateformes`
              : "Source"}
          </h3>
          <ul className="mt-2 space-y-1 text-sm">
            {listing.sources.map((s, i) => (
              <li key={`${s.source}-${i}`}>
                {s.url ? (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-navy-600 hover:text-navy hover:underline"
                  >
                    {SOURCE_LABEL[s.source] ?? s.source} ↗
                  </a>
                ) : (
                  <span className="text-ink-2">
                    {SOURCE_LABEL[s.source] ?? s.source}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full rounded-full bg-gold px-4 py-3 text-center font-semibold text-navy transition hover:bg-gold-700"
        >
          Planifier une visite
        </a>
        <button
          type="button"
          onClick={async () => {
            const ok = await shareListing({
              title: listing.title,
              url: listingUrl,
            });
            setShareOk(ok);
            setTimeout(() => setShareOk(false), 2000);
          }}
          className="w-full rounded-full border border-line bg-white px-4 py-2.5 text-sm font-semibold text-navy transition hover:bg-paper-2"
        >
          {shareOk ? "Lien copié" : "Partager"}
        </button>
        {onReport && (
          <button
            type="button"
            onClick={onReport}
            className="text-xs text-muted underline-offset-2 hover:text-ink-2 hover:underline"
          >
            Signaler une incohérence
          </button>
        )}
      </div>
    </aside>
  );
}
