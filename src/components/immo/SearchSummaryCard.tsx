"use client";

import Link from "next/link";
import { formatPrice } from "@/lib/format";
import type { PreviewListing } from "@/lib/search-preview";
import { toParams } from "@/lib/search-filters";
import type { SearchFilters } from "@/lib/llm/extract-filters";
import Ico from "./Ico";

export default function SearchSummaryCard({
  filters,
  summary,
  preview,
}: {
  filters: SearchFilters;
  summary: string;
  preview: {
    total: number;
    listings: PreviewListing[];
    medianHint: string | null;
  };
}) {
  const href = `/?${toParams(filters).toString()}`;

  return (
    <div className="mt-2 rounded-2xl border border-gold-soft bg-gold-tint/30 p-3 shadow-card">
      <p className="text-sm font-medium text-navy">{summary}</p>
      <p className="mt-1 text-xs text-ink-2">
        {preview.total} bien{preview.total > 1 ? "s" : ""} trouvé
        {preview.total > 1 ? "s" : ""}
        {preview.medianHint ? ` · quartier ${preview.medianHint}` : ""}
      </p>
      {preview.listings.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {preview.listings.map((l) => (
            <li key={l.id}>
              <Link
                href={`/listings/${l.id}`}
                className="flex items-center gap-2 rounded-lg bg-white/80 px-2 py-1.5 text-xs hover:bg-white"
              >
                {l.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={l.photo}
                    alt=""
                    className="h-8 w-10 rounded object-cover"
                  />
                ) : (
                  <span className="grid h-8 w-10 place-items-center rounded bg-paper-2 text-[9px] text-muted">
                    immo
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate font-medium text-navy">
                  {l.title}
                </span>
                <span className="tnum shrink-0 text-ink-2">
                  {formatPrice(l.price, l.transactionType)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link
        href={href}
        className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-navy-600 hover:underline"
      >
        <Ico name="pin" size={13} /> Voir tous les résultats
      </Link>
    </div>
  );
}
