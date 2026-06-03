"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { DEFAULT_TANA_BBOX } from "@/lib/map-layers";
import { type Filters, parseFilters, toParams } from "@/lib/search-filters";
import { useMounted } from "@/lib/use-mounted";
import ConversationalBar from "./immo/ConversationalBar";
import ListingDrawer from "./immo/ListingDrawer";
import ListingSkeleton from "./immo/ListingSkeleton";
import MarketCarousel from "./immo/MarketCarousel";
import PropertyCard, { type PropertySummary } from "./immo/PropertyCard";
import Ico from "./immo/Ico";
import FiltersPanel from "./FiltersPanel";
import type { Bbox, MapMarker } from "./Map";

const Map = dynamic(() => import("./Map"), { ssr: false });
const ProfileBanner = dynamic(
  () => import("./immo/ProfileBanner"),
  { ssr: false },
);

type Listing = PropertySummary & { lng: number; lat: number };

const SORT_OPTIONS: { id: Filters["sort"]; label: string }[] = [
  { id: "compat", label: "Pour vous" },
  { id: "confidence", label: "Confiance" },
  { id: "price_asc", label: "Prix ↑" },
  { id: "price_desc", label: "Prix ↓" },
];

export default function HomeView({
  hasProfile,
}: {
  hasProfile?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [flyToTarget, setFlyToTarget] = useState<{
    lng: number;
    lat: number;
  } | null>(null);
  const [filters, setFilters] = useState<Filters>({});
  const [bbox, setBbox] = useState<Bbox | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, startTransition] = useTransition();
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [topMatchOnly, setTopMatchOnly] = useState(false);
  const [showMedian, setShowMedian] = useState(false);
  const [showIsochrone, setShowIsochrone] = useState(false);
  const [marketMedians, setMarketMedians] = useState<
    { fokontany: string; medianPricePerSqm: number }[]
  >([]);
  const [reportId, setReportId] = useState<string | null>(null);
  const requestSeq = useRef(0);
  const mounted = useMounted();

  const effectiveBbox = bbox ?? DEFAULT_TANA_BBOX;

  const query = useMemo(
    () => toParams(filters, effectiveBbox).toString(),
    [filters, effectiveBbox],
  );

  useEffect(() => {
    setBbox((b) => b ?? DEFAULT_TANA_BBOX);
  }, []);

  const searchKey = searchParams.toString();
  useEffect(() => {
    const params = new URLSearchParams(searchKey);
    setFilters(parseFilters((k) => params.get(k)));
    setSelectedId(params.get("listing"));
  }, [searchKey]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.txn) params.set("txn", filters.txn);
    fetch(`/api/market/batch?${params}`)
      .then((r) => r.json())
      .then(
        (d: {
          neighborhoods: {
            fokontany: string;
            medianPricePerSqm: number | null;
          }[];
        }) => {
          setMarketMedians(
            (d.neighborhoods ?? [])
              .filter((n) => n.medianPricePerSqm != null)
              .map((n) => ({
                fokontany: n.fokontany,
                medianPricePerSqm: n.medianPricePerSqm!,
              })),
          );
        },
      )
      .catch(() => setMarketMedians([]));
  }, [filters.txn]);

  useEffect(() => {
    const seq = ++requestSeq.current;
    const ac = new AbortController();
    startTransition(async () => {
      try {
        const res = await fetch(`/api/listings?${query}`, { signal: ac.signal });
        if (!res.ok) throw new Error("fetch failed");
        const data = (await res.json()) as { listings: Listing[] };
        if (seq === requestSeq.current) {
          setListings(data.listings ?? []);
          setFetchError(null);
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        if (seq === requestSeq.current) {
          setListings([]);
          setFetchError("Impossible de charger les biens. Réessayez.");
        }
      }
    });
    return () => ac.abort();
  }, [query]);

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

  const visibleListings = useMemo(() => {
    if (!topMatchOnly || !topMatchId) return listings;
    return listings.filter((l) => l.id === topMatchId);
  }, [listings, topMatchOnly, topMatchId]);

  const openListing = useCallback(
    (id: string) => {
      setSelectedId(id);
      const params = new URLSearchParams(searchParams.toString());
      params.set("listing", id);
      router.replace(`/?${params.toString()}`, { scroll: false });
      const item = listings.find((l) => l.id === id);
      if (item) setFlyToTarget({ lng: item.lng, lat: item.lat });
    },
    [listings, router, searchParams],
  );

  const closeDrawer = useCallback(() => {
    setSelectedId(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("listing");
    const q = params.toString();
    router.replace(q ? `/?${q}` : "/", { scroll: false });
  }, [router, searchParams]);

  const markers: MapMarker[] = useMemo(
    () =>
      visibleListings.map((l) => ({
        id: l.id,
        lng: l.lng,
        lat: l.lat,
        price: l.price,
        transactionType: l.transactionType,
        topMatch: l.id === topMatchId,
        highlighted: l.id === hoveredId || l.id === selectedId,
        onClick: () => openListing(l.id),
      })),
    [visibleListings, topMatchId, hoveredId, selectedId, openListing],
  );

  const handleMoveEnd = useCallback((b: Bbox) => setBbox(b), []);
  const [filtersOpen, setFiltersOpen] = useState(false);

  return (
    <div className="relative flex h-[calc(100dvh-3.5rem)] max-md:h-[calc(100dvh-7rem-env(safe-area-inset-bottom,0px))] flex-col">
      <div className="z-10 shrink-0 border-b border-line bg-paper">
        <div className="space-y-2 px-4 py-2 md:space-y-3 md:px-6 md:py-3">
          <ConversationalBar
            onFilters={(f) => setFilters((prev) => ({ ...prev, ...f }))}
          />
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            className="flex w-full items-center justify-between rounded-xl border border-line bg-paper-2 px-3 py-2 text-left text-xs font-semibold text-navy"
            aria-expanded={filtersOpen}
          >
            <span>
              {filtersOpen ? "Masquer filtres" : "Filtres et quartiers"}
            </span>
            <span
              className={`text-ink-2 transition ${filtersOpen ? "rotate-180" : ""}`}
              aria-hidden
            >
              ▼
            </span>
          </button>
        </div>
        <div
          className={`max-h-[min(42dvh,400px)] shrink-0 overflow-y-auto overscroll-contain px-4 pb-3 md:max-h-[min(26dvh,260px)] md:px-6 ${
            filtersOpen ? "block" : "hidden"
          }`}
        >
          <div className="space-y-3">
            <MarketCarousel
              txn={filters.txn}
              selected={filters.fokontany}
              onSelect={(f) => setFilters((prev) => ({ ...prev, fokontany: f }))}
            />
            {hasProfile === false && <ProfileBanner />}
            <div className="flex flex-wrap items-center gap-2">
              {SORT_OPTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() =>
                    setFilters((prev) => ({ ...prev, sort: s.id }))
                  }
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    (filters.sort ?? "compat") === s.id
                      ? "bg-navy text-paper"
                      : "bg-paper-2 text-ink-2 hover:bg-white"
                  }`}
                >
                  {s.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setTopMatchOnly((v) => !v)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  topMatchOnly
                    ? "bg-gold text-navy"
                    : "bg-paper-2 text-ink-2"
                }`}
              >
                Top match
              </button>
            </div>
            <FiltersPanel value={filters} onChange={setFilters} />
          </div>
        </div>
      </div>

      <div className="relative flex-1 basis-0 min-h-[min(58dvh,680px)]">
        <Map
          className="absolute inset-0 h-full w-full"
          markers={markers}
          showFokontany
          showMedianLayer={showMedian}
          showIsochrone={showIsochrone}
          marketMedians={marketMedians}
          flyToTarget={flyToTarget}
          onMoveEnd={handleMoveEnd}
        />

        <div className="absolute left-3 top-3 flex flex-col gap-2 md:left-4">
          {loading && (
            <div
              className="flex items-center gap-2 rounded-full border border-navy-600/40 bg-navy/90 px-3 py-1.5 text-xs font-medium text-paper shadow backdrop-blur-sm"
              role="status"
            >
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-gold" />
              Recherche…
            </div>
          )}
          {fetchError && (
            <p className="rounded-lg bg-absent/90 px-3 py-2 text-xs text-paper">
              {fetchError}
            </p>
          )}
        </div>

        <div className="absolute right-3 top-3 flex flex-col gap-1 md:right-4">
          <MapToggle
            label="Médiane m²"
            on={showMedian}
            onChange={setShowMedian}
          />
          <MapToggle
            label="15 min centre"
            on={showIsochrone}
            onChange={setShowIsochrone}
          />
        </div>

        {/* Mobile bottom sheet */}
        <aside className="absolute inset-x-0 bottom-0 z-20 max-h-[40dvh] overflow-hidden rounded-t-3xl border border-line bg-paper/98 shadow-drawer backdrop-blur-md md:hidden">
          <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line" />
          <div className="overflow-y-auto px-3 py-3 pb-4">
            <p className="mb-2 px-1 text-xs font-medium text-ink-2">
              {mounted
                ? `${visibleListings.length} bien${visibleListings.length > 1 ? "s" : ""}`
                : "Chargement…"}
            </p>
            <ListingList
              listings={mounted ? visibleListings : []}
              loading={!mounted || loading}
              topMatchId={topMatchId}
              onOpen={openListing}
              onHover={setHoveredId}
            />
          </div>
        </aside>

        {/* Desktop sidebar */}
        <aside className="absolute bottom-0 right-0 top-0 z-20 hidden w-[400px] overflow-y-auto border-l border-line bg-paper-2/98 px-3 py-3 backdrop-blur-md md:block">
          <p className="mb-2 px-1 text-xs font-medium text-ink-2">
            {mounted
              ? `${visibleListings.length} bien${visibleListings.length > 1 ? "s" : ""} dans la vue`
              : "Chargement…"}
          </p>
          <ListingList
            listings={mounted ? visibleListings : []}
            loading={!mounted || loading}
            topMatchId={topMatchId}
            onOpen={openListing}
            onHover={setHoveredId}
          />
        </aside>
      </div>

      <ListingDrawer
        listingId={selectedId}
        onClose={closeDrawer}
        onReport={(id) => setReportId(id)}
      />

      {reportId && (
        <ReportDialog listingId={reportId} onClose={() => setReportId(null)} />
      )}
    </div>
  );
}

function MapToggle({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`rounded-full px-3 py-1.5 text-[11px] font-semibold shadow backdrop-blur-sm ${
        on ? "bg-gold text-navy" : "bg-white/95 text-navy"
      }`}
    >
      {label}
    </button>
  );
}

function ListingList({
  listings,
  loading,
  topMatchId,
  onOpen,
  onHover,
}: {
  listings: Listing[];
  loading: boolean;
  topMatchId: string | null;
  onOpen: (id: string) => void;
  onHover: (id: string | null) => void;
}) {
  if (listings.length === 0 && !loading) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-white p-6 text-center shadow-card">
        <Ico name="pin" size={22} className="mx-auto text-gold-700" />
        <p className="mt-2 font-display text-sm font-semibold text-navy">
          Aucun bien dans cette zone
        </p>
      </div>
    );
  }
  if (loading && listings.length === 0) {
    return (
      <ul className="animate-stagger space-y-3">
        {[0, 1, 2].map((i) => (
          <li key={i}>
            <ListingSkeleton />
          </li>
        ))}
      </ul>
    );
  }
  return (
    <ul className="animate-stagger space-y-3">
      {listings.map((l) => (
        <li
          key={l.id}
          onMouseEnter={() => onHover(l.id)}
          onMouseLeave={() => onHover(null)}
        >
          <PropertyCard
            listing={l}
            topMatch={l.id === topMatchId}
            onOpen={() => onOpen(l.id)}
          />
        </li>
      ))}
    </ul>
  );
}

function ReportDialog({
  listingId,
  onClose,
}: {
  listingId: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("prix_incoherent");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    setBusy(true);
    await fetch(`/api/listings/${listingId}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    setDone(true);
    setBusy(false);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-navy/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-paper p-6 shadow-drawer">
        <h2 className="font-display text-lg font-semibold text-navy">
          Signaler une incohérence
        </h2>
        {done ? (
          <p className="mt-4 text-sm text-ink-2">Merci, votre signalement a été enregistré.</p>
        ) : (
          <>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-4 w-full rounded-lg border border-line px-3 py-2 text-sm"
            >
              <option value="prix_incoherent">Prix incohérent</option>
              <option value="photos">Photos suspectes</option>
              <option value="doublon">Doublon</option>
              <option value="autre">Autre</option>
            </select>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-full border border-line py-2 text-sm"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void submit()}
                className="flex-1 rounded-full bg-navy py-2 text-sm font-semibold text-paper"
              >
                Envoyer
              </button>
            </div>
          </>
        )}
        {done && (
          <button
            type="button"
            onClick={onClose}
            className="mt-4 w-full rounded-full bg-gold py-2 text-sm font-semibold text-navy"
          >
            Fermer
          </button>
        )}
      </div>
    </div>
  );
}
