/**
 * Rule-based French → filters extractor. Pure (no network): it is both the
 * no-API-key fallback for conversational search and the unit-tested core the
 * OpenAI path is checked against. Handles transaction, property type, budget
 * (million/k multipliers, ranges), surface, rooms, neighborhood, amenities.
 */
import {
  AMENITY_LABELS,
  extractAmenities,
  type Amenity,
} from "@/lib/amenities";
import { matchFokontanyByName } from "@/lib/fokontany";
import { enrichSearchFilters, parseRadiusKm } from "@/lib/search-anchor";

export type SearchFilters = {
  txn?: "sale" | "rent";
  propertyType?: "house" | "apartment" | "land" | "commercial" | "other";
  minPrice?: number;
  maxPrice?: number;
  minSurface?: number;
  minRooms?: number;
  fokontany?: string;
  /** Libellé du lieu (rempli après géocodage dynamique). */
  nearLabel?: string;
  /** Centre du rayon (WGS84), issu de Nominatim. */
  nearLng?: number;
  nearLat?: number;
  /** @deprecated Utiliser nearLabel + géocodage — conservé pour URLs anciennes */
  nearLandmark?: string;
  /** Rayon en km autour du point géocodé ou du centroïde fokontany. */
  radiusKm?: number;
  /** Exclut les annonces dont le titre contient ce motif (ex. « villa » si l'utilisateur dit « maison »). */
  excludeTitleContains?: string;
  amenities?: Amenity[];
};

export type ExtractResult = { filters: SearchFilters; summary: string };

const PROPERTY_LABEL: Record<string, string> = {
  house: "maison",
  apartment: "appartement",
  land: "terrain",
  commercial: "local commercial",
  other: "bien",
};

/** Lowercase + strip diacritics for matching against the working string. */
function fold(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

const MULT: Record<string, number> = { million: 1e6, millions: 1e6, m: 1e6, k: 1e3 };

function amount(num: string, unit?: string): number {
  const n = parseFloat(num.replace(/\s/g, "").replace(",", "."));
  const mult = unit ? (MULT[unit] ?? 1) : 1;
  return Math.round(n * mult);
}

const NUM = "(\\d+(?:[ .,]\\d+)?)";
const UNIT = "(millions?|m|k)?";

export function extractFilters(query: string): ExtractResult {
  let s = fold(query);
  const filters: SearchFilters = {};

  // Transaction
  if (/\b(louer|locations?|en location|a louer|loue)\b/.test(s)) filters.txn = "rent";
  else if (/\b(acheter|achat|a vendre|vendre|vente|acquerir)\b/.test(s))
    filters.txn = "sale";

  // Property type
  if (/\bappart|appartement|studio\b/.test(s)) filters.propertyType = "apartment";
  else if (/\bvilla\b/.test(s)) filters.propertyType = "house";
  else if (/\bmaison\b/.test(s)) filters.propertyType = "house";
  else if (/\bterrain|parcelle\b/.test(s)) filters.propertyType = "land";
  else if (/\blocal|commercial|commerce|bureau|boutique|entrepot\b/.test(s))
    filters.propertyType = "commercial";

  // Surface and rooms first — they carry explicit units (m², pièces) so we can
  // blank their spans before parsing prices ("au moins 120 m²" is not a budget).
  const surf = s.match(
    new RegExp(`${NUM}\\s*(?:m²|m2|metres? carres?|metre carre)`),
  );
  if (surf) {
    filters.minSurface = Math.round(amount(surf[1]));
    s = s.replace(surf[0], " ");
  }
  const rooms = s.match(new RegExp(`${NUM}\\s*(?:pieces?|chambres?|pcs)`));
  if (rooms) {
    filters.minRooms = Math.round(amount(rooms[1]));
    s = s.replace(rooms[0], " ");
  }

  // Price range: "entre X et Y [unit]" (first unit inherits the second's).
  const range = s.match(
    new RegExp(`entre\\s+${NUM}\\s*${UNIT}\\s+et\\s+${NUM}\\s*${UNIT}`),
  );
  if (range) {
    const unit = range[2] || range[4];
    filters.minPrice = amount(range[1], unit);
    filters.maxPrice = amount(range[3], range[4] || unit);
    s = s.replace(range[0], " ");
  }

  // Max budget
  const max = s.match(
    new RegExp(
      `(?:moins de|max(?:imum)?|jusqu'?a|budget(?: max(?:imum)?)?|sous|<=?)\\s*${NUM}\\s*${UNIT}`,
    ),
  );
  if (max && filters.maxPrice === undefined) {
    filters.maxPrice = amount(max[1], max[2]);
    s = s.replace(max[0], " ");
  }

  // Min budget
  const min = s.match(
    new RegExp(
      `(?:plus de|a partir de|au moins|minimum|min|>=?|au-?dela de)\\s*${NUM}\\s*${UNIT}`,
    ),
  );
  if (min && filters.minPrice === undefined) {
    filters.minPrice = amount(min[1], min[2]);
  }

  const radiusKm = parseRadiusKm(query);
  if (radiusKm != null) filters.radiusKm = radiusKm;

  const fok = matchFokontanyByName(query);
  if (fok && radiusKm == null) filters.fokontany = fok;

  const amenities = extractAmenities(query);
  if (amenities.length > 0) filters.amenities = amenities;

  const enriched = enrichSearchFilters(query, filters);
  return { filters: enriched, summary: summarize(enriched) };
}

const ARIARY = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

export function summarize(f: SearchFilters): string {
  const parts: string[] = [];
  if (f.txn) parts.push(f.txn === "rent" ? "location" : "vente");
  if (f.propertyType) parts.push(PROPERTY_LABEL[f.propertyType]);
  if (f.nearLabel && f.radiusKm) {
    parts.push(`autour de ${f.nearLabel} (${f.radiusKm} km)`);
  } else if (f.nearLabel) {
    parts.push(`près de ${f.nearLabel}`);
  } else if (f.fokontany) {
    parts.push(
      f.radiusKm
        ? `à ${f.fokontany} (rayon ${f.radiusKm} km)`
        : `à ${f.fokontany}`,
    );
  }
  if (f.minPrice !== undefined && f.maxPrice !== undefined)
    parts.push(`${ARIARY.format(f.minPrice)}–${ARIARY.format(f.maxPrice)} Ar`);
  else if (f.maxPrice !== undefined)
    parts.push(`budget max ${ARIARY.format(f.maxPrice)} Ar`);
  else if (f.minPrice !== undefined)
    parts.push(`budget min ${ARIARY.format(f.minPrice)} Ar`);
  if (f.minSurface !== undefined) parts.push(`≥ ${f.minSurface} m²`);
  if (f.minRooms !== undefined) parts.push(`≥ ${f.minRooms} pièces`);
  if (f.amenities?.length)
    parts.push(f.amenities.map((a) => AMENITY_LABELS[a]).join(", "));
  return parts.length ? `Recherche : ${parts.join(" · ")}.` : "Tous les biens.";
}
