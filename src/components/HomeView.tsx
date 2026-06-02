"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { type Filters, parseFilters, toParams } from "@/lib/search-filters";
import ConversationalBar from "./immo/ConversationalBar";
import ListingSkeleton from "./immo/ListingSkeleton";
import MarketBand from "./immo/MarketBand";
import PropertyCard, {
  type PropertySummary,
} from "./immo/PropertyCard";
import Ico from "./immo/Ico";
import FiltersPanel from "./FiltersPanel";
import type { Bbox, MapMarker } from "./Map";

const Map = dynamic(() => import("./Map"), { ssr: false });

type Listing = PropertySummary & { lng: number; lat: number };

export default function HomeView() {
  const searchParams = useSearchParams();
  // Seed from the URL once (deep links from chat / the Carte tab).
  const [filters, setFilters] = useState<Filters>(() =>
    parseFilters((k) => searchParams.get(k)),
  );
  const [bbox, setBbox] = useState<Bbox | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, startTransition] = useTransition();
  const requestSeq = useRef(0);

  const query = useMemo(
    () => toParams(filters, bbox).toString(),
    [filters, bbox],
  );

  useEffect(() => {
    if (!bbox) return;
    const seq = ++requestSeq.current;
    const ac = new AbortController();
    startTransition(async () => {
      try {
        const res = await fetch(`/api/listings?${query}`, { signal: ac.signal });
        const data = (await res.json()) as { listings: Listing[] };
        if (seq === requestSeq.current) setListings(data.listings ?? []);
      } catch {
        if (seq === requestSeq.current) setListings([]);
      }
    });
    return () => ac.abort();
  }, [query, bbox]);

  // Top match (gold halo): by declared compatibility when a profile is active,
  // otherwise by confidence.
  const topMatchId = useMemo(() => {
    const hasCompat = listings.some((l) => l.compatibility != null);
    const rank = (l: Listing) =>
      hasCompat ? (l.compatibility ?? -1) : (l.confidenceScore ?? -1);
    let best: Listing | null = null;
    for (const l of listings) {
      if (rank(l) < 0) continue;
      if (!best || rank(l) > rank(best)) best = l;
    }
    return best?.id ?? null;
  }, [listings]);

  const markers: MapMarker[] = useMemo(
    () =>
      listings.map((l) => ({
        id: l.id,
        lng: l.lng,
        lat: l.lat,
        price: l.price,
        transactionType: l.transactionType,
        topMatch: l.id === topMatchId,
        onClick: () => {
          window.location.href = `/listings/${l.id}`;
        },
      })),
    [listings, topMatchId],
  );

  const handleMoveEnd = useCallback((b: Bbox) => setBbox(b), []);

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col md:h-[calc(100dvh-3.5rem)]">
      <div className="space-y-3 border-b border-line bg-paper px-4 py-3 md:px-6">
        <ConversationalBar
          onFilters={(f) => setFilters((prev) => ({ ...prev, ...f }))}
        />
        {filters.fokontany && (
          <MarketBand fokontany={filters.fokontany} txn={filters.txn} />
        )}
        <FiltersPanel value={filters} onChange={setFilters} />
      </div>
      <div className="grid flex-1 grid-rows-[45dvh_1fr] overflow-hidden md:grid-cols-[1fr_400px] md:grid-rows-1">
        <div className="relative">
          <Map
            className="h-full w-full"
            markers={markers}
            showFokontany
            onMoveEnd={handleMoveEnd}
          />
          {loading && (
            <div
              className="absolute left-3 top-3 flex items-center gap-2 rounded-full border border-navy-600/40 bg-navy/90 px-3 py-1.5 text-xs font-medium text-paper shadow backdrop-blur-sm"
              role="status"
              aria-live="polite"
            >
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-gold" />
              Recherche…
            </div>
          )}
        </div>
        <aside className="overflow-y-auto border-line bg-paper-2 px-3 py-3 md:border-l">
          <p className="mb-2 px-1 text-xs font-medium text-ink-2">
            {listings.length} bien{listings.length > 1 ? "s" : ""} dans la vue
          </p>
          {listings.length === 0 && !loading ? (
            <div className="rounded-2xl border border-dashed border-line bg-white p-8 text-center shadow-card">
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-gold-tint">
                <Ico name="pin" size={22} className="text-gold-700" />
              </div>
              <p className="font-display text-base font-semibold text-navy">
                Aucun bien dans cette zone
              </p>
              <p className="mt-1.5 text-sm text-muted">
                Déplacez la carte, élargissez la vue ou décrivez votre recherche
                dans la barre ci-dessus.
              </p>
            </div>
          ) : loading && listings.length === 0 ? (
            <ul className="space-y-3" aria-busy="true" aria-label="Chargement">
              {[0, 1, 2].map((i) => (
                <li key={i}>
                  <ListingSkeleton />
                </li>
              ))}
            </ul>
          ) : (
            <ul className="space-y-3">
              {listings.map((l) => (
                <li key={l.id}>
                  <PropertyCard listing={l} topMatch={l.id === topMatchId} />
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
