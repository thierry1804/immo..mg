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
export type Filters = SearchFilters & { sort?: SortKey };

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
  return f;
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
  if (filters.amenities?.length) p.set("amenities", filters.amenities.join(","));
  if (filters.sort && filters.sort !== "relevance") p.set("sort", filters.sort);
  return p;
}
