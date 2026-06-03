import { fokontanyCentroid, matchFokontanyByName } from "@/lib/fokontany";
import type { SearchFilters } from "@/lib/llm/extract-filters";
import { geocode } from "@/scrapers/geocode";

const PLACE_STOP =
  /^(louer|location|vente|madagascar|tananarive|antananarivo|maison|villa|appartement|terrain)$/i;

/** Extrait un lieu cité dans la requête (repère, quartier, « autour de … »). */
export function extractPlacePhrase(query: string): string | null {
  const q = query.trim();
  const patterns = [
    /autour\s+(?:de|d[''])\s*(?:la\s+|le\s+|l[''])?(.+?)(?:\s*$|\s+environ|\s*,)/i,
    /(?:près|proche)\s+(?:de\s+)?(?:la\s+|le\s+|l[''])?(.+?)(?:\s*$|\s*,|\s+environ)/i,
    /(?:région|region)\s+d['']?\s*(.+?)(?:\s+sur|\s+environ|\s*,|$)/i,
    /(?:à|dans)\s+(?:la\s+|le\s+|l[''])?([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9'\-\s]{2,60}?)(?:\s*,|\s+sur un rayon|\s+environ|\s+avec|\s+budget|\s+qui\s+se\s+trouve|$)/i,
  ];
  for (const re of patterns) {
    const m = re.exec(q);
    if (!m?.[1]) continue;
    const phrase = m[1].trim().replace(/\s+/g, " ");
    if (phrase.length >= 3 && !PLACE_STOP.test(phrase)) return phrase;
  }
  return matchFokontanyByName(q);
}

function buildGeocodeQuery(place: string): string {
  const p = place.trim();
  if (/antananarivo|madagascar|tananarive/i.test(p)) return p;
  return `${p}, Antananarivo, Madagascar`;
}

/** Géocode un lieu via Nominatim (cache DB + mémoire). */
export async function geocodePlace(
  place: string,
): Promise<{ lng: number; lat: number } | null> {
  return geocode(buildGeocodeQuery(place));
}

/**
 * Centre dynamique pour une recherche à rayon : géocode le lieu extrait de la requête.
 * Sans repères codés en dur — tout POI / quartier passe par Nominatim.
 */
export async function resolveSearchPlace(
  query: string,
  filters: SearchFilters,
): Promise<SearchFilters> {
  const out = { ...filters };

  if (out.radiusKm == null || out.radiusKm <= 0) {
    return out;
  }

  const phrase =
    extractPlacePhrase(query) ?? out.nearLabel ?? out.fokontany ?? null;
  if (!phrase) return out;

  const coord = await geocodePlace(phrase);
  if (coord) {
    return {
      ...out,
      nearLng: coord.lng,
      nearLat: coord.lat,
      nearLabel: phrase,
      fokontany: undefined,
      nearLandmark: undefined,
    };
  }

  // Secours : centroïde fokontany si le géocodeur échoue
  const fok = matchFokontanyByName(phrase) ?? out.fokontany;
  if (fok) {
    const c = fokontanyCentroid(fok);
    if (c) {
      return {
        ...out,
        nearLng: c.lng,
        nearLat: c.lat,
        nearLabel: phrase,
        fokontany: undefined,
      };
    }
  }

  return { ...out, nearLabel: phrase };
}

/** Géocode un lieu d'URL si rayon sans coordonnées (partage de lien, rechargement). */
export async function resolveListingsGeoQuery<
  T extends {
    radiusKm?: number;
    nearLng?: number;
    nearLat?: number;
    nearLabel?: string;
    nearLandmark?: string;
    fokontany?: string;
  },
>(q: T): Promise<T> {
  if (q.radiusKm == null || q.radiusKm <= 0) return q;
  if (q.nearLng != null && q.nearLat != null) return q;
  const phrase = q.nearLabel ?? q.nearLandmark;
  if (!phrase) return q;
  const coord = await geocodePlace(phrase);
  if (!coord) return q;
  const { fokontany: _drop, ...rest } = q;
  return {
    ...rest,
    nearLng: coord.lng,
    nearLat: coord.lat,
    nearLabel: q.nearLabel ?? phrase,
    fokontany: undefined,
  } as T;
}
