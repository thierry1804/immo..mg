/**
 * Declared-compatibility score (0–100): how well a listing matches a user's
 * explicitly stated preferences (PRODUCT §6). No behavioral/implicit learning —
 * only the declared profile. Pure: no DB/network/React imports.
 *
 * Dimensions left blank by the profile score neutrally (full marks), so they
 * neither help nor penalize. A profile with no constraints scores everything
 * 100% — callers gate the ring on the existence of a profile.
 */
import type { Amenity } from "./amenities";

export type CompatKey = "budget" | "location" | "equipment" | "typeSurface";

export const COMPATIBILITY_WEIGHTS: Record<CompatKey, number> = {
  budget: 0.33,
  location: 0.28,
  equipment: 0.22,
  typeSurface: 0.17,
};

const LABELS: Record<CompatKey, string> = {
  budget: "Budget",
  location: "Quartier",
  equipment: "Équipements indispensables",
  typeSurface: "Type & surface",
};

export type CompatProfile = {
  budgetMin: number | null;
  budgetMax: number | null;
  transactionType: "sale" | "rent" | null;
  quartiers: string[];
  mustHave: Amenity[];
  propertyTypes: string[];
  minSurface: number | null;
};

export type CompatListing = {
  price: number;
  transactionType: "sale" | "rent";
  fokontany: string | null;
  amenities: Amenity[];
  propertyType: string;
  surfaceM2: number;
};

export type CompatCheck = {
  key: CompatKey;
  label: string;
  weight: number;
  /** 0–1 match for this dimension. */
  match: number;
};

export type CompatibilityResult = { score: number; breakdown: CompatCheck[] };

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/** Cheaper than the max is fine; only exceeding it decays (max/price). */
function budgetMatch(p: CompatProfile, l: CompatListing): number {
  if (p.budgetMax == null && p.budgetMin == null) return 1;
  let m = 1;
  if (p.budgetMax != null && l.price > p.budgetMax) m = p.budgetMax / l.price;
  if (p.budgetMin != null && l.price < p.budgetMin)
    // Slightly soft: well below a stated floor is mildly off-target.
    m = Math.min(m, clamp01(l.price / p.budgetMin));
  return clamp01(m);
}

function locationMatch(p: CompatProfile, l: CompatListing): number {
  if (p.quartiers.length === 0) return 1;
  if (!l.fokontany) return 0;
  return p.quartiers.includes(l.fokontany) ? 1 : 0;
}

function equipmentMatch(p: CompatProfile, l: CompatListing): number {
  if (p.mustHave.length === 0) return 1;
  const have = p.mustHave.filter((a) => l.amenities.includes(a)).length;
  return have / p.mustHave.length;
}

function typeSurfaceMatch(p: CompatProfile, l: CompatListing): number {
  const typeOk =
    p.propertyTypes.length === 0 || p.propertyTypes.includes(l.propertyType)
      ? 1
      : 0;
  const surfaceOk =
    p.minSurface == null
      ? 1
      : l.surfaceM2 >= p.minSurface
        ? 1
        : clamp01(l.surfaceM2 / p.minSurface);
  // Transaction mismatch zeroes this dimension (a sale can't satisfy a renter).
  const txnOk = p.transactionType && p.transactionType !== l.transactionType ? 0 : 1;
  return ((typeOk + surfaceOk) / 2) * txnOk;
}

export function computeCompatibility(
  profile: CompatProfile,
  listing: CompatListing,
): CompatibilityResult {
  const matches: Record<CompatKey, number> = {
    budget: budgetMatch(profile, listing),
    location: locationMatch(profile, listing),
    equipment: equipmentMatch(profile, listing),
    typeSurface: typeSurfaceMatch(profile, listing),
  };

  const breakdown: CompatCheck[] = (
    Object.keys(COMPATIBILITY_WEIGHTS) as CompatKey[]
  ).map((key) => ({
    key,
    label: LABELS[key],
    weight: COMPATIBILITY_WEIGHTS[key],
    match: clamp01(matches[key]),
  }));

  const score = Math.round(
    breakdown.reduce((sum, b) => sum + b.match * b.weight, 0) * 100,
  );

  return { score, breakdown };
}
