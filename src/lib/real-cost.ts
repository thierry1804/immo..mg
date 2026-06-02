import type { Amenity } from "./amenities";

export type RealCostInput = {
  price: number;
  transactionType: "sale" | "rent";
  surfaceM2: number;
  amenities: Amenity[];
};

export type RealCostBreakdown = {
  loyer: number;
  eau: number;
  electricite: number;
  gardien: number;
  charges: number;
  total: number;
};

const GUARD_COST = 300_000; // Ar/month, typical shared-guard contribution
const GENERATOR_FUEL = 120_000; // Ar/month fuel provision when a generator exists
const BASE_CHARGES = 50_000; // Ar/month baseline co-property charges

/** Round to the nearest 5,000 Ar so estimates read as estimates, not exacts. */
function round5k(n: number): number {
  return Math.round(n / 5000) * 5000;
}

/** Water estimate by surface tier (Ar/month). */
function water(surfaceM2: number): number {
  if (surfaceM2 <= 50) return 40_000;
  if (surfaceM2 <= 100) return 70_000;
  if (surfaceM2 <= 150) return 100_000;
  return 130_000;
}

/** Electricity estimate by surface tier (Ar/month). */
function electricity(surfaceM2: number): number {
  if (surfaceM2 <= 50) return 80_000;
  if (surfaceM2 <= 100) return 130_000;
  if (surfaceM2 <= 150) return 180_000;
  return 240_000;
}

/**
 * Estimate the real monthly cost of a rental (rent + utilities + guard +
 * charges). Returns null for sales. All figures are rounded estimates.
 */
export function estimateRealCost(
  input: RealCostInput,
): RealCostBreakdown | null {
  if (input.transactionType !== "rent") return null;

  const loyer = input.price;
  const eau = round5k(water(input.surfaceM2));
  const electricite = round5k(electricity(input.surfaceM2));
  const gardien = input.amenities.includes("guard") ? GUARD_COST : 0;
  const charges = round5k(
    BASE_CHARGES +
      (input.amenities.includes("generator") ? GENERATOR_FUEL : 0),
  );
  const total = loyer + eau + electricite + gardien + charges;

  return { loyer, eau, electricite, gardien, charges, total };
}
