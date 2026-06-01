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
import { shortPriceLabel } from "@/lib/format";
import FiltersPanel, { type Filters } from "./FiltersPanel";
import ListingCard, { type ListingSummary } from "./ListingCard";
import type { Bbox, MapMarker } from "./Map";

const Map = dynamic(() => import("./Map"), { ssr: false });

type Listing = ListingSummary & { lng: number; lat: number };

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

  const markers: MapMarker[] = useMemo(
    () =>
      listings.map((l) => ({
        id: l.id,
        lng: l.lng,
        lat: l.lat,
        label: shortPriceLabel(l.price, l.transactionType),
        onClick: () => {
          window.location.href = `/listings/${l.id}`;
        },
      })),
    [listings],
  );

  const handleMoveEnd = useCallback((b: Bbox) => setBbox(b), []);

  return (
    <div className="flex h-[calc(100dvh-3.25rem)] flex-col">
      <div className="border-b border-zinc-200 bg-white p-3">
        <FiltersPanel value={filters} onChange={setFilters} />
      </div>
      <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-[1fr_360px]">
        <div className="relative">
          <Map
            className="h-full w-full"
            markers={markers}
            onMoveEnd={handleMoveEnd}
          />
          {loading && (
            <div className="absolute left-3 top-3 rounded bg-white/90 px-3 py-1 text-xs shadow">
              Chargement...
            </div>
          )}
        </div>
        <aside className="overflow-y-auto border-l border-zinc-200 bg-zinc-50 p-3">
          <p className="mb-2 text-xs text-zinc-600">
            {listings.length} annonce{listings.length > 1 ? "s" : ""} dans la
            vue
          </p>
          {listings.length === 0 ? (
            <p className="rounded border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
              Aucune annonce dans cette zone. Élargissez la vue ou ajustez les
              filtres.
            </p>
          ) : (
            <ul className="space-y-2">
              {listings.map((l) => (
                <li key={l.id}>
                  <ListingCard listing={l} />
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
