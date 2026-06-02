/**
 * Premium amenities that matter to the affluent Antananarivo buyer
 * (DESIGN/PRODUCT §4.5). Pure data + keyword extraction — no UI/DB imports.
 */
export const AMENITIES = [
  "guard",
  "generator",
  "cistern",
  "parking",
  "gated",
  "paved",
  "ac",
  "fiber",
  "pool",
] as const;

export type Amenity = (typeof AMENITIES)[number];

export const AMENITY_LABELS: Record<Amenity, string> = {
  guard: "Gardien 24h",
  generator: "Groupe électrogène",
  cistern: "Citerne / eau autonome",
  parking: "Parking couvert",
  gated: "Résidence sécurisée",
  paved: "Accès bitumé",
  ac: "Climatisation",
  fiber: "Internet fibré",
  pool: "Piscine",
};

// Keyword patterns matched against accent-stripped, lowercased text.
const PATTERNS: Record<Amenity, RegExp> = {
  guard: /\bgardien|gardiennage|\bvigile/,
  generator: /groupe\s*electrogene|generateur|groupe\s*elec/,
  cistern: /citerne|forage|\bpuits\b|bache a eau|eau autonome/,
  parking: /parking|\bgarage\b|stationnement/,
  gated: /residence fermee|residence securisee|\bsecurise|cloture|gated/,
  paved: /bitume|goudronn|asphalt|voie pavee/,
  ac: /climatis|\bclim\b|air conditionn/,
  fiber: /\bfibre|fibre optique|internet fibr/,
  pool: /piscine|\bpool\b/,
};

/** Lowercase and strip diacritics so "électrogène" matches "electrogene". */
function fold(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036F]/g, "");
}

/**
 * Extract the premium amenities mentioned in free text (title + description).
 * Returns a deduplicated list in canonical AMENITIES order.
 */
export function extractAmenities(text: string): Amenity[] {
  const folded = fold(text);
  return AMENITIES.filter((a) => PATTERNS[a].test(folded));
}
