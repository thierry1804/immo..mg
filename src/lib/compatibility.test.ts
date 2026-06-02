import { describe, expect, it } from "vitest";
import {
  COMPATIBILITY_WEIGHTS,
  computeCompatibility,
  type CompatProfile,
} from "./compatibility";

const PROFILE: CompatProfile = {
  budgetMin: null,
  budgetMax: 2_000_000,
  transactionType: "rent",
  quartiers: ["Ivandry", "Ambatobe"],
  mustHave: ["guard", "generator"],
  propertyTypes: ["apartment", "house"],
  minSurface: 100,
};

const PERFECT = {
  price: 1_800_000,
  transactionType: "rent" as const,
  fokontany: "Ivandry",
  amenities: ["guard", "generator", "pool"] as const,
  propertyType: "apartment",
  surfaceM2: 120,
};

describe("COMPATIBILITY_WEIGHTS", () => {
  it("sum to 1", () => {
    const total = Object.values(COMPATIBILITY_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 5);
  });
});

describe("computeCompatibility", () => {
  it("scores a fully matching listing at or near 100", () => {
    const r = computeCompatibility(PROFILE, { ...PERFECT, amenities: [...PERFECT.amenities] });
    expect(r.score).toBe(100);
  });

  it("penalizes a listing over budget", () => {
    const r = computeCompatibility(PROFILE, {
      ...PERFECT,
      amenities: [...PERFECT.amenities],
      price: 4_000_000, // 2x the max budget
    });
    const budget = r.breakdown.find((b) => b.key === "budget")!;
    expect(budget.match).toBeLessThan(1);
    expect(r.score).toBeLessThan(100);
  });

  it("treats a price under max budget as a full budget match", () => {
    const r = computeCompatibility(PROFILE, {
      ...PERFECT,
      amenities: [...PERFECT.amenities],
      price: 500_000,
    });
    expect(r.breakdown.find((b) => b.key === "budget")!.match).toBe(1);
  });

  it("scores location by whether the fokontany is a preferred one", () => {
    const out = computeCompatibility(PROFILE, {
      ...PERFECT,
      amenities: [...PERFECT.amenities],
      fokontany: "Analakely",
    });
    expect(out.breakdown.find((b) => b.key === "location")!.match).toBe(0);
  });

  it("scores equipment by the fraction of must-have amenities present", () => {
    const r = computeCompatibility(PROFILE, {
      ...PERFECT,
      amenities: ["guard"], // 1 of 2 must-haves
    });
    expect(r.breakdown.find((b) => b.key === "equipment")!.match).toBe(0.5);
  });

  it("gives a neutral (full) score for dimensions the profile leaves blank", () => {
    const blank: CompatProfile = {
      budgetMin: null,
      budgetMax: null,
      transactionType: null,
      quartiers: [],
      mustHave: [],
      propertyTypes: [],
      minSurface: null,
    };
    const r = computeCompatibility(blank, {
      ...PERFECT,
      amenities: [...PERFECT.amenities],
    });
    expect(r.score).toBe(100);
  });

  it("returns a score between 0 and 100 with a labeled breakdown", () => {
    const r = computeCompatibility(PROFILE, {
      ...PERFECT,
      amenities: [],
      fokontany: null,
      price: 10_000_000,
      propertyType: "land",
      surfaceM2: 10,
    });
    expect(r.score).toBeGreaterThanOrEqual(0);
    expect(r.score).toBeLessThanOrEqual(100);
    for (const b of r.breakdown) {
      expect(b.label.length).toBeGreaterThan(0);
      expect(b.match).toBeGreaterThanOrEqual(0);
      expect(b.match).toBeLessThanOrEqual(1);
    }
  });
});
