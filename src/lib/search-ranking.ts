export const RELEVANCE_WEIGHTS = {
  semantic: 0.35,
  lexical: 0.25,
  proximity: 0.2,
  confidence: 0.1,
  freshness: 0.1,
} as const;

const DEFAULT_RADIUS_KM = 10;
const FRESHNESS_HALFLIFE_DAYS = 30;

/** Seuil de similarité cosinus pour le plancher de pertinence (requête purement textuelle). */
export const SEMANTIC_MATCH_FLOOR = 0.2;

export type RelevanceSignals = {
  lexRank: number | null;
  cosine: number | null; // [-1,1]
  distanceM: number | null;
  confidence: number | null; // [0,100]
  createdAt: Date;
};

export type RelevanceContext = { radiusKm: number | null; now: Date };

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export function computeRelevanceScore(
  s: RelevanceSignals,
  ctx: RelevanceContext,
): number {
  // Lexical : ts_rank est non borné ; saturation douce.
  const lexical = s.lexRank == null ? 0 : clamp01(s.lexRank / (s.lexRank + 1));
  // Sémantique : cosinus [-1,1] → [0,1].
  const semantic = s.cosine == null ? 0 : clamp01((s.cosine + 1) / 2);
  // Proximité : 1 au centre, 0 au-delà du rayon (ou rayon par défaut).
  const radiusM = (ctx.radiusKm ?? DEFAULT_RADIUS_KM) * 1000;
  const proximity =
    s.distanceM == null ? 0 : clamp01(1 - s.distanceM / radiusM);
  // Confiance : [0,100] → [0,1].
  const confidence = s.confidence == null ? 0 : clamp01(s.confidence / 100);
  // Fraîcheur : décroissance exponentielle (demi-vie 30j).
  const ageDays =
    (ctx.now.getTime() - s.createdAt.getTime()) / 86_400_000;
  const freshness = clamp01(
    Math.pow(0.5, Math.max(0, ageDays) / FRESHNESS_HALFLIFE_DAYS),
  );

  return (
    RELEVANCE_WEIGHTS.semantic * semantic +
    RELEVANCE_WEIGHTS.lexical * lexical +
    RELEVANCE_WEIGHTS.proximity * proximity +
    RELEVANCE_WEIGHTS.confidence * confidence +
    RELEVANCE_WEIGHTS.freshness * freshness
  );
}
