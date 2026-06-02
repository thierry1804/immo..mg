import { describe, expect, it } from "vitest";
import { CONFIDENCE_WEIGHTS, computeConfidence } from "./confidence";

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
