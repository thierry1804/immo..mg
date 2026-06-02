import { describe, expect, it } from "vitest";
import { isLikelyDuplicate, pricePerSqm } from "./enrich";

describe("pricePerSqm", () => {
  it("divides price by surface, rounded", () => {
    expect(pricePerSqm(2_000_000, 100)).toBe(20_000);
  });
  it("returns null when surface is missing", () => {
    expect(pricePerSqm(2_000_000, 0)).toBeNull();
  });
});

describe("isLikelyDuplicate", () => {
  const base = { transactionType: "rent" as const, price: 2_000_000, surfaceM2: 100 };
  it("matches when price within 5% and surface within 10% and same txn", () => {
    expect(
      isLikelyDuplicate(base, {
        transactionType: "rent",
        price: 2_050_000,
        surfaceM2: 105,
      }),
    ).toBe(true);
  });
  it("rejects different transaction types", () => {
    expect(
      isLikelyDuplicate(base, {
        transactionType: "sale",
        price: 2_000_000,
        surfaceM2: 100,
      }),
    ).toBe(false);
  });
  it("rejects price gap beyond 5%", () => {
    expect(
      isLikelyDuplicate(base, {
        transactionType: "rent",
        price: 2_200_000,
        surfaceM2: 100,
      }),
    ).toBe(false);
  });
  it("rejects surface gap beyond 10%", () => {
    expect(
      isLikelyDuplicate(base, {
        transactionType: "rent",
        price: 2_000_000,
        surfaceM2: 130,
      }),
    ).toBe(false);
  });
});
