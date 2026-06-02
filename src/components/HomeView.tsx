"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import PropertyCard, {
  type PropertySummary,
} from "./immo/PropertyCard";
import FiltersPanel, { type Filters } from "./FiltersPanel";
import type { Bbox, MapMarker } from "./Map";

const Map = dynamic(() => import("./Map"), { ssr: false });

type Listing = PropertySummary & { lng: number; lat: number };

function buildQuery(filters: Filters, bbox: Bbox | null): string {
  const params = new URLSearchParams();
  if (bbox) {
    params.set(
      "bbox",
      `${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}`,
    );
  }
  if (filters.txn) params.set("txn", filters.txn);
  if (filters.propertyType) params.set("propertyType", filters.propertyType);
  if (filters.minPrice !== undefined)
    params.set("minPrice", String(filters.minPrice));
  if (filters.maxPrice !== undefined)
    params.set("maxPrice", String(filters.maxPrice));
  if (filters.minSurface !== undefined)
    params.set("minSurface", String(filters.minSurface));
  if (filters.minRooms !== undefined)
    params.set("minRooms", String(filters.minRooms));
  if (filters.amenities?.length)
    params.set("amenities", filters.amenities.join(","));
  if (filters.sort && filters.sort !== "relevance")
    params.set("sort", filters.sort);
  return params.toString();
}

export default function HomeView() {
  const [filters, setFilters] = useState<Filters>({});
  const [bbox, setBbox] = useState<Bbox | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, startTransition] = useTransition();
  const requestSeq = useRef(0);

  const query = useMemo(() => buildQuery(filters, bbox), [filters, bbox]);

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

  // Top match: highest confidence in view (gold halo on card + map marker).
  const topMatchId = useMemo(() => {
    let best: Listing | null = null;
    for (const l of listings) {
      if (l.confidenceScore == null) continue;
      if (!best || (l.confidenceScore ?? 0) > (best.confidenceScore ?? 0))
        best = l;
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
      <div className="border-b border-line bg-paper px-4 py-3 md:px-6">
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
            <div className="absolute left-3 top-3 rounded-full bg-navy/90 px-3 py-1 text-xs font-medium text-paper shadow">
              Recherche…
            </div>
          )}
        </div>
        <aside className="overflow-y-auto border-line bg-paper-2 px-3 py-3 md:border-l">
          <p className="mb-2 px-1 text-xs font-medium text-ink-2">
            {listings.length} bien{listings.length > 1 ? "s" : ""} dans la vue
          </p>
          {listings.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line bg-white p-6 text-center text-sm text-muted">
              Aucun bien dans cette zone. Élargissez la vue ou ajustez les
              filtres.
            </p>
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
