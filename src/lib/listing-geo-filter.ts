import { eq, sql, type SQL } from "drizzle-orm";
import { listings } from "@/db/schema";
import type { SearchFilters } from "@/lib/llm/extract-filters";
import { fokontanyCentroid } from "@/lib/fokontany";

function withinRadius(
  lng: number,
  lat: number,
  radiusKm: number,
): SQL {
  return sql`ST_DWithin(
    ${listings.location},
    ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
    ${radiusKm * 1000}
  )`;
}

/**
 * Filtre géographique : rayon autour de coordonnées géocodées, centroïde fokontany, ou égalité quartier.
 */
export function listingLocationCondition(
  filters: Pick<
    SearchFilters,
    "fokontany" | "nearLng" | "nearLat" | "radiusKm"
  >,
): SQL | undefined {
  const radiusKm = filters.radiusKm;
  if (radiusKm != null && radiusKm > 0) {
    if (filters.nearLng != null && filters.nearLat != null) {
      return withinRadius(filters.nearLng, filters.nearLat, radiusKm);
    }
    if (filters.fokontany) {
      const c = fokontanyCentroid(filters.fokontany);
      if (c) return withinRadius(c.lng, c.lat, radiusKm);
    }
    return undefined;
  }
  if (filters.fokontany) return eq(listings.fokontany, filters.fokontany);
  return undefined;
}
