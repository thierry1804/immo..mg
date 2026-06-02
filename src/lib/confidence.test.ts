import { describe, expect, it } from "vitest";
import {
  CONFIDENCE_WEIGHTS,
  computeConfidence,
  markConfidenceCheck,
  scoreFromBreakdown,
} from "./confidence";

const IDEAL = {
  photoCount: 6,
  surfaceM2: 120,
  fokontany: "Ivandry",
  ageDays: 3,
  price: 2_000_000,
  neighborhoodMedianPrice: 2_000_000,
  sourceCount: 2,
};

describe("CONFIDENCE_WEIGHTS", () => {
  it("sum to 100", () => {
    const total = Object.values(CONFIDENCE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBe(100);
  });
});

describe("computeConfidence", () => {
  it("scores an ideal listing at 100 with all checks ok", () => {
    const r = computeConfidence(IDEAL);
    expect(r.score).toBe(100);
    expect(r.breakdown.every((c) => c.ok)).toBe(true);
  });

  it("scores a worst-case listing at 0 with all checks failing", () => {
    const r = computeConfidence({
      photoCount: 0,
      surfaceM2: 0,
      fokontany: null,
      ageDays: 400,
      price: 100_000,
      neighborhoodMedianPrice: 2_000_000,
      sourceCount: 1,
    });
    expect(r.score).toBe(0);
    expect(r.breakdown.every((c) => !c.ok)).toBe(true);
  });

  it("fails the photo check below 4 photos", () => {
    const r = computeConfidence({ ...IDEAL, photoCount: 2 });
    const photos = r.breakdown.find((c) => c.key === "photos")!;
    expect(photos.ok).toBe(false);
    expect(r.score).toBe(100 - CONFIDENCE_WEIGHTS.photos);
  });

  it("flags price as incoherent when far below the neighborhood median", () => {
    const r = computeConfidence({
      ...IDEAL,
      price: 500_000, // 75% below 2,000,000 median
    });
    const price = r.breakdown.find((c) => c.key === "price")!;
    expect(price.ok).toBe(false);
  });

  it("treats price as coherent when no median is known (neutral pass)", () => {
    const r = computeConfidence({ ...IDEAL, neighborhoodMedianPrice: null });
    const price = r.breakdown.find((c) => c.key === "price")!;
    expect(price.ok).toBe(true);
  });

  it("each breakdown item carries a human label and its weight", () => {
    const r = computeConfidence(IDEAL);
    for (const c of r.breakdown) {
      expect(c.label.length).toBeGreaterThan(0);
      expect(c.weight).toBe(CONFIDENCE_WEIGHTS[c.key]);
    }
  });
});

describe("scoreFromBreakdown", () => {
  it("sums the weights of passing checks, matching computeConfidence", () => {
    const r = computeConfidence({ ...IDEAL, photoCount: 1 });
    expect(scoreFromBreakdown(r.breakdown)).toBe(r.score);
  });
});

describe("markConfidenceCheck", () => {
  // Models the dedup follow-up: a single-source canonical (multiSource failing)
  // gains its 15-point multi-source credit when a second source is linked.
  it("flips a failing check to ok and bumps the recomputed score by its weight", () => {
    const single = computeConfidence({ ...IDEAL, sourceCount: 1 });
    expect(single.breakdown.find((c) => c.key === "multiSource")!.ok).toBe(
      false,
    );

    const upgraded = markConfidenceCheck(single.breakdown, "multiSource");
    expect(upgraded.find((c) => c.key === "multiSource")!.ok).toBe(true);
    expect(scoreFromBreakdown(upgraded)).toBe(
      single.score + CONFIDENCE_WEIGHTS.multiSource,
    );
  });

  it("is a no-op (same score) when the check already passes", () => {
    const multi = computeConfidence({ ...IDEAL, sourceCount: 2 });
    const upgraded = markConfidenceCheck(multi.breakdown, "multiSource");
    expect(scoreFromBreakdown(upgraded)).toBe(multi.score);
  });

  it("does not mutate the input breakdown", () => {
    const r = computeConfidence({ ...IDEAL, sourceCount: 1 });
    const before = r.breakdown.find((c) => c.key === "multiSource")!.ok;
    markConfidenceCheck(r.breakdown, "multiSource");
    expect(r.breakdown.find((c) => c.key === "multiSource")!.ok).toBe(before);
  });
});
