/**
 * Confidence score (0–100) with an explainable breakdown (PRODUCT §4.1).
 * MVP-feasible criteria only; weights renormalized to sum to 100. Criteria
 * from spec §5.3 that need infrastructure we lack — perceptual photo-hash
 * originality and phone-number verification — are intentionally omitted.
 */
export type ConfidenceKey =
  | "photos"
  | "surface"
  | "fokontany"
  | "recency"
  | "price"
  | "multiSource";

export const CONFIDENCE_WEIGHTS: Record<ConfidenceKey, number> = {
  photos: 20, // at least 4 photos
  surface: 10, // surface present
  fokontany: 15, // neighborhood identified
  recency: 15, // updated within 30 days
  price: 25, // coherent with neighborhood median
  multiSource: 15, // seen on 2+ platforms
};

const LABELS: Record<ConfidenceKey, string> = {
  photos: "Photos suffisantes (4+)",
  surface: "Surface renseignée",
  fokontany: "Quartier identifié",
  recency: "Annonce récente",
  price: "Prix cohérent avec le marché",
  multiSource: "Vu sur plusieurs plateformes",
};

export type ConfidenceInput = {
  photoCount: number;
  surfaceM2: number;
  fokontany: string | null;
  ageDays: number;
  price: number;
  /** Median price for the listing's neighborhood, or null if unknown. */
  neighborhoodMedianPrice: number | null;
  /** Number of distinct platforms this listing was seen on (>= 1). */
  sourceCount: number;
};

export type ConfidenceCheck = {
  key: ConfidenceKey;
  label: string;
  ok: boolean;
  weight: number;
};

export type ConfidenceResult = {
  score: number;
  breakdown: ConfidenceCheck[];
};

/**
 * Price is "coherent" when within 40%–250% of the neighborhood median.
 * If the median is unknown we cannot disprove it, so it passes (neutral).
 */
function priceCoherent(price: number, median: number | null): boolean {
  if (median === null || median <= 0) return true;
  const ratio = price / median;
  return ratio >= 0.4 && ratio <= 2.5;
}

export function computeConfidence(input: ConfidenceInput): ConfidenceResult {
  const checks: Record<ConfidenceKey, boolean> = {
    photos: input.photoCount >= 4,
    surface: input.surfaceM2 > 0,
    fokontany: input.fokontany !== null,
    recency: input.ageDays <= 30,
    price: priceCoherent(input.price, input.neighborhoodMedianPrice),
    multiSource: input.sourceCount >= 2,
  };

  const breakdown: ConfidenceCheck[] = (
    Object.keys(CONFIDENCE_WEIGHTS) as ConfidenceKey[]
  ).map((key) => ({
    key,
    label: LABELS[key],
    ok: checks[key],
    weight: CONFIDENCE_WEIGHTS[key],
  }));

  const score = breakdown.reduce(
    (sum, c) => sum + (c.ok ? c.weight : 0),
    0,
  );

  return { score, breakdown };
}
