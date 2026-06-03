import type { SearchFilters } from "@/lib/llm/extract-filters";

/** Extrait un rayon en km depuis une requête en français. */
export function parseRadiusKm(query: string): number | undefined {
  const s = query
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036F]/g, "");
  const patterns = [
    /(?:rayon|radius)\s*(?:de\s+)?(\d+(?:[.,]\d+)?)\s*km/,
    /environ\s+(\d+(?:[.,]\d+)?)\s*km/,
    /(\d+(?:[.,]\d+)?)\s*km\s+(?:autour|autour de|de rayon)/,
    /(?:autour|dans un rayon)\s+(?:de\s+)?(\d+(?:[.,]\d+)?)\s*km/,
    /(\d+(?:[.,]\d+)?)\s*km\b/,
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (m?.[1]) {
      const n = Math.round(parseFloat(m[1].replace(",", ".")));
      if (n > 0 && n <= 50) return n;
    }
  }
  return undefined;
}

function foldQuery(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036F]/g, "");
}

/** « Maison » sans « villa » → on suppose le type maison, sans exclure de titres. */
function applyMaisonVillaHint(
  query: string,
  filters: SearchFilters,
): SearchFilters {
  const s = foldQuery(query);
  if (/\bmaison\b/.test(s) && !/\bvilla\b/.test(s)) {
    return { ...filters, propertyType: filters.propertyType ?? "house" };
  }
  return filters;
}

/** Complète les filtres synchrones (rayon, maison/villa) — le lieu est géocodé ensuite. */
export function enrichSearchFilters(
  query: string,
  filters: SearchFilters,
): SearchFilters {
  let out = applyMaisonVillaHint(query, { ...filters });
  const radius = parseRadiusKm(query);
  if (radius != null) out.radiusKm = radius;
  return out;
}
