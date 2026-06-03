/**
 * Shared filter shape + (de)serialization for the search experience. Used by
 * FiltersPanel, HomeView, the conversational chat, and to build the listings
 * API query. Keeps URL params, API params, and component state in sync.
 */
import { AMENITIES, type Amenity } from "@/lib/amenities";
import type { SearchFilters } from "@/lib/llm/extract-filters";

export type { SearchFilters };

export type SortKey =
  | "relevance"
  | "price_asc"
  | "price_desc"
  | "surface"
  | "confidence"
  | "compat";

/** Component/URL state: search filters plus the active sort. */
export type Filters = SearchFilters & { sort?: SortKey; q?: string };

const NUM_KEYS = ["minPrice", "maxPrice", "minSurface", "minRooms"] as const;

/** Read filters + sort from any (key)=>value source (URLSearchParams.get). */
export function parseFilters(get: (k: string) => string | null): Filters {
  const f: Filters = {};
  const txn = get("txn");
  if (txn === "sale" || txn === "rent") f.txn = txn;
  const pt = get("propertyType");
  if (pt && ["house", "apartment", "land", "commercial", "other"].includes(pt))
    f.propertyType = pt as SearchFilters["propertyType"];
  for (const k of NUM_KEYS) {
    const v = get(k);
    if (v != null && v !== "" && Number.isFinite(Number(v)))
      f[k] = Number(v);
  }
  const fok = get("fokontany");
  if (fok) f.fokontany = fok;
  const lm = get("nearLandmark");
  if (lm) f.nearLandmark = lm;
  const label = get("nearLabel");
  if (label) f.nearLabel = label;
  const nearLng = get("nearLng");
  const nearLat = get("nearLat");
  if (nearLng != null && nearLng !== "" && Number.isFinite(Number(nearLng)))
    f.nearLng = Number(nearLng);
  if (nearLat != null && nearLat !== "" && Number.isFinite(Number(nearLat)))
    f.nearLat = Number(nearLat);
  const radius = get("radiusKm");
  if (radius != null && radius !== "" && Number.isFinite(Number(radius)))
    f.radiusKm = Number(radius);
  const excl = get("excludeTitleContains");
  if (excl) f.excludeTitleContains = excl;
  const amen = get("amenities");
  if (amen) {
    const list = amen
      .split(",")
      .filter((a): a is Amenity => (AMENITIES as readonly string[]).includes(a));
    if (list.length) f.amenities = list;
  }
  const sort = get("sort");
  if (
    sort &&
    ["price_asc", "price_desc", "surface", "confidence", "compat"].includes(sort)
  )
    f.sort = sort as SortKey;
  const q = get("q");
  if (q) f.q = q;
  return f;
}

/** True when any search constraint (not default map sort) is active. */
export function hasActiveFilters(filters: Filters): boolean {
  return !!(
    filters.txn ||
    filters.propertyType ||
    filters.minPrice != null ||
    filters.maxPrice != null ||
    filters.minSurface != null ||
    filters.minRooms != null ||
    filters.fokontany ||
    filters.nearLandmark ||
    filters.nearLabel ||
    (filters.nearLng != null && filters.nearLat != null) ||
    filters.radiusKm != null ||
    (filters.amenities?.length ?? 0) > 0 ||
    (filters.sort && filters.sort !== "compat" && filters.sort !== "relevance") ||
    filters.q
  );
}

/** Serialize filters (+ optional bbox) into URLSearchParams entries. */
export function toParams(
  filters: Filters,
  bbox?: { minLng: number; minLat: number; maxLng: number; maxLat: number } | null,
): URLSearchParams {
  const p = new URLSearchParams();
  if (bbox)
    p.set("bbox", `${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat}`);
  if (filters.txn) p.set("txn", filters.txn);
  if (filters.propertyType) p.set("propertyType", filters.propertyType);
  for (const k of NUM_KEYS)
    if (filters[k] !== undefined) p.set(k, String(filters[k]));
  if (filters.fokontany) p.set("fokontany", filters.fokontany);
  if (filters.nearLandmark) p.set("nearLandmark", filters.nearLandmark);
  if (filters.nearLabel) p.set("nearLabel", filters.nearLabel);
  if (filters.nearLng != null) p.set("nearLng", String(filters.nearLng));
  if (filters.nearLat != null) p.set("nearLat", String(filters.nearLat));
  if (filters.radiusKm != null) p.set("radiusKm", String(filters.radiusKm));
  if (filters.excludeTitleContains)
    p.set("excludeTitleContains", filters.excludeTitleContains);
  if (filters.amenities?.length) p.set("amenities", filters.amenities.join(","));
  if (filters.sort && filters.sort !== "relevance") p.set("sort", filters.sort);
  if (filters.q) p.set("q", filters.q);
  return p;
}
