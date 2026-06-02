import { describe, expect, it } from "vitest";
import { estimateRealCost } from "./real-cost";

describe("estimateRealCost", () => {
  it("returns null for sales", () => {
    expect(
      estimateRealCost({
        price: 500_000_000,
        transactionType: "sale",
        surfaceM2: 120,
        amenities: [],
      }),
    ).toBeNull();
  });

  it("sums rent + utilities + charges for a rental", () => {
    const c = estimateRealCost({
      price: 1_500_000,
      transactionType: "rent",
      surfaceM2: 120,
      amenities: [],
    })!;
    expect(c.loyer).toBe(1_500_000);
    expect(c.eau).toBeGreaterThan(0);
    expect(c.electricite).toBeGreaterThan(0);
    expect(c.gardien).toBe(0);
    expect(c.total).toBe(
      c.loyer + c.eau + c.electricite + c.gardien + c.charges,
    );
  });

  it("adds a guard cost when the guard amenity is present", () => {
    const without = estimateRealCost({
      price: 1_500_000,
      transactionType: "rent",
      surfaceM2: 120,
      amenities: [],
    })!;
    const withGuard = estimateRealCost({
      price: 1_500_000,
      transactionType: "rent",
      surfaceM2: 120,
      amenities: ["guard"],
    })!;
    expect(withGuard.gardien).toBeGreaterThan(0);
    expect(withGuard.total).toBeGreaterThan(without.total);
  });

  it("adds a generator fuel provision to charges", () => {
    const withGen = estimateRealCost({
      price: 1_500_000,
      transactionType: "rent",
      surfaceM2: 120,
      amenities: ["generator"],
    })!;
    const without = estimateRealCost({
      price: 1_500_000,
      transactionType: "rent",
      surfaceM2: 120,
      amenities: [],
    })!;
    expect(withGen.charges).toBeGreaterThan(without.charges);
  });

  it("scales utilities up for larger surfaces", () => {
    const small = estimateRealCost({
      price: 1_000_000,
      transactionType: "rent",
      surfaceM2: 40,
      amenities: [],
    })!;
    const large = estimateRealCost({
      price: 1_000_000,
      transactionType: "rent",
      surfaceM2: 200,
      amenities: [],
    })!;
    expect(large.eau + large.electricite).toBeGreaterThan(
      small.eau + small.electricite,
    );
  });
});
