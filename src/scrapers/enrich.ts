import type { TransactionType } from "./types";

/** Price per square meter (Ar/m²), rounded; null when surface unknown. */
export function pricePerSqm(price: number, surfaceM2: number): number | null {
  if (surfaceM2 <= 0) return null;
  return Math.round(price / surfaceM2);
}

type DupKey = {
  transactionType: TransactionType;
  price: number;
  surfaceM2: number;
};

/**
 * Non-spatial half of the dedup predicate: same transaction type, price within
 * ±5%, surface within ±10%. The spatial proximity (~150 m) is enforced by the
 * caller via PostGIS ST_DWithin before this check.
 */
export function isLikelyDuplicate(a: DupKey, b: DupKey): boolean {
  if (a.transactionType !== b.transactionType) return false;
  if (a.price <= 0 || b.price <= 0) return false;
  const priceRatio = Math.abs(a.price - b.price) / a.price;
  if (priceRatio > 0.05) return false;
  if (a.surfaceM2 > 0 && b.surfaceM2 > 0) {
    const surfRatio = Math.abs(a.surfaceM2 - b.surfaceM2) / a.surfaceM2;
    if (surfRatio > 0.1) return false;
  }
  return true;
}
