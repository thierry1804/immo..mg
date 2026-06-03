import { describe, expect, it } from "vitest";
import { computeRelevanceScore, RELEVANCE_WEIGHTS } from "@/lib/search-ranking";

const now = new Date("2026-06-03T00:00:00Z");

describe("computeRelevanceScore", () => {
  // lexRank=1000 (not 1) so the soft-saturation formula (rank/(rank+1)) yields
  // ~0.999, mapping all signals near-max and making score > 0.99 hold.
  // A raw ts_rank of 1 only maps to 0.5 via soft-saturation, giving ~0.875 total.
  it("somme pondérée normalisée dans [0,1]", () => {
    const s = computeRelevanceScore(
      { lexRank: 1000, cosine: 1, distanceM: 0, confidence: 100, createdAt: now },
      { radiusKm: 5, now },
    );
    expect(s).toBeGreaterThan(0.99);
  });

  it("signaux absents = contribution neutre (0), pas NaN", () => {
    const s = computeRelevanceScore(
      { lexRank: null, cosine: null, distanceM: null, confidence: null, createdAt: now },
      { radiusKm: null, now },
    );
    expect(Number.isFinite(s)).toBe(true);
    expect(s).toBeGreaterThanOrEqual(0);
  });

  it("la proximité décroît avec la distance", () => {
    const near = computeRelevanceScore(
      { lexRank: 0, cosine: 0, distanceM: 0, confidence: 0, createdAt: now },
      { radiusKm: 5, now },
    );
    const far = computeRelevanceScore(
      { lexRank: 0, cosine: 0, distanceM: 5000, confidence: 0, createdAt: now },
      { radiusKm: 5, now },
    );
    expect(near).toBeGreaterThan(far);
  });

  it("les poids somment à 1", () => {
    const total = Object.values(RELEVANCE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 5);
  });
});
