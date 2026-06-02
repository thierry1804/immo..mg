# Milestone 2a — Enrichment Pure-Function Libraries — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the four pure, dependency-free domain libraries the immo·mg enrichment needs — premium amenities extraction, fokontany (Antananarivo neighborhood) resolution, real-cost estimation, and confidence scoring — each test-driven, with a vitest harness, so Milestone 2b can wire them into the schema and scraper pipeline.

**Architecture:** Each library is a pure module under `src/lib/` with no database, network, or React imports, so it is trivially unit-testable and reusable from the scraper pipeline, API routes, and UI. Functions take plain inputs and return plain data. A new vitest harness runs `*.test.ts` files with the `@/` path alias resolved via a tiny `vitest.config.ts`.

**Tech Stack:** TypeScript, vitest (new devDependency), Node 20.

> **Read before coding (AGENTS.md):** This Next.js is customized — but these libraries are framework-agnostic TypeScript with no Next.js APIs, so no Next-specific docs apply. Do NOT import from `next/*`, `@/db/*`, `undici`, or React in any file created here.

> **TDD is mandatory** for Tasks 2–5: write the failing test first, watch it fail, implement minimally, watch it pass, then commit. Use the superpowers:test-driven-development discipline.

---

## File Structure

| File | Responsibility |
|---|---|
| `vitest.config.ts` (create) | Vitest config: node environment + `@` → `src` alias. |
| `package.json` (modify) | Add `vitest` devDependency + `test` script. |
| `src/lib/amenities.ts` (create) | Canonical premium-amenity list, French labels, and keyword extraction from free text. |
| `src/lib/amenities.test.ts` (create) | Tests for the amenity list and extraction. |
| `src/lib/fokontany.ts` (create) | Antananarivo neighborhood data + resolve-by-coordinate and match-by-name. |
| `src/lib/fokontany.test.ts` (create) | Tests for resolution and name matching. |
| `src/lib/real-cost.ts` (create) | Monthly real-cost estimation for rentals. |
| `src/lib/real-cost.test.ts` (create) | Tests for the cost breakdown. |
| `src/lib/confidence.ts` (create) | Confidence score (0–100) + explainable breakdown. |
| `src/lib/confidence.test.ts` (create) | Tests for scoring and breakdown. |

---

## Task 1: Vitest test harness

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `src/lib/smoke.test.ts` (temporary, deleted at end of task)

- [ ] **Step 1: Add vitest as a dev dependency**

Run: `npm install -D vitest@^3`
Expected: `vitest` appears in `devDependencies`.

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": resolve(__dirname, "src") },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 3: Add the `test` script to package.json**

In the `"scripts"` block, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Write a smoke test**

Create `src/lib/smoke.test.ts`:

```ts
import { describe, expect, it } from "vitest";

describe("vitest harness", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Run the test suite**

Run: `npm test`
Expected: PASS — 1 passed.

- [ ] **Step 6: Delete the smoke test and confirm an empty-but-valid run**

Run: `rm src/lib/smoke.test.ts`

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "test: add vitest harness with @ alias"
```

---

## Task 2: Premium amenities library

**Files:**
- Create: `src/lib/amenities.ts`
- Test: `src/lib/amenities.test.ts`

The canonical amenity keys, French labels, and a keyword extractor over free text (title + description). No React/icon imports — icon mapping belongs to the M3 display layer.

- [ ] **Step 1: Write the failing test**

Create `src/lib/amenities.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { AMENITIES, AMENITY_LABELS, extractAmenities } from "./amenities";

describe("AMENITIES", () => {
  it("has a French label for every key", () => {
    for (const a of AMENITIES) {
      expect(AMENITY_LABELS[a]).toBeTruthy();
    }
  });
});

describe("extractAmenities", () => {
  it("detects a guard", () => {
    expect(extractAmenities("Villa avec gardien 24h")).toContain("guard");
  });

  it("detects a backup generator", () => {
    expect(extractAmenities("équipée d'un groupe électrogène")).toContain(
      "generator",
    );
  });

  it("detects a water cistern", () => {
    expect(extractAmenities("citerne d'eau et forage")).toContain("cistern");
  });

  it("detects covered parking", () => {
    expect(extractAmenities("parking couvert pour 2 voitures")).toContain(
      "parking",
    );
  });

  it("detects a gated/secured residence", () => {
    expect(extractAmenities("résidence fermée et sécurisée")).toContain(
      "gated",
    );
  });

  it("detects paved access", () => {
    expect(extractAmenities("accès bitumé jusqu'au portail")).toContain(
      "paved",
    );
  });

  it("detects air conditioning", () => {
    expect(extractAmenities("chambres climatisées")).toContain("ac");
  });

  it("detects fiber internet", () => {
    expect(extractAmenities("internet par fibre optique")).toContain("fiber");
  });

  it("detects a pool", () => {
    expect(extractAmenities("grande piscine chauffée")).toContain("pool");
  });

  it("returns a deduplicated, stable-ordered list", () => {
    const result = extractAmenities("gardien, gardiennage, piscine, piscine");
    expect(result).toEqual(["guard", "pool"]);
  });

  it("returns an empty array when nothing matches", () => {
    expect(extractAmenities("joli appartement lumineux")).toEqual([]);
  });

  it("is accent and case insensitive", () => {
    expect(extractAmenities("GROUPE ELECTROGENE")).toContain("generator");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test src/lib/amenities.test.ts`
Expected: FAIL — cannot import from `./amenities` (module not found).

- [ ] **Step 3: Implement `src/lib/amenities.ts`**

```ts
/**
 * Premium amenities that matter to the affluent Antananarivo buyer
 * (DESIGN/PRODUCT §4.5). Pure data + keyword extraction — no UI/DB imports.
 */
export const AMENITIES = [
  "guard",
  "generator",
  "cistern",
  "parking",
  "gated",
  "paved",
  "ac",
  "fiber",
  "pool",
] as const;

export type Amenity = (typeof AMENITIES)[number];

export const AMENITY_LABELS: Record<Amenity, string> = {
  guard: "Gardien 24h",
  generator: "Groupe électrogène",
  cistern: "Citerne / eau autonome",
  parking: "Parking couvert",
  gated: "Résidence sécurisée",
  paved: "Accès bitumé",
  ac: "Climatisation",
  fiber: "Internet fibré",
  pool: "Piscine",
};

// Keyword patterns matched against accent-stripped, lowercased text.
const PATTERNS: Record<Amenity, RegExp> = {
  guard: /\bgardien|gardiennage|\bvigile/,
  generator: /groupe\s*electrogene|generateur|groupe\s*elec/,
  cistern: /citerne|forage|\bpuits\b|bache a eau|eau autonome/,
  parking: /parking|\bgarage\b|stationnement/,
  gated: /residence fermee|residence securisee|\bsecurise|cloture|gated/,
  paved: /bitume|goudronn|asphalt|voie pavee/,
  ac: /climatis|\bclim\b|air conditionn/,
  fiber: /\bfibre|fibre optique|internet fibr/,
  pool: /piscine|\bpool\b/,
};

/** Lowercase and strip diacritics so "électrogène" matches "electrogene". */
function fold(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * Extract the premium amenities mentioned in free text (title + description).
 * Returns a deduplicated list in canonical AMENITIES order.
 */
export function extractAmenities(text: string): Amenity[] {
  const folded = fold(text);
  return AMENITIES.filter((a) => PATTERNS[a].test(folded));
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test src/lib/amenities.test.ts`
Expected: PASS — all assertions green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/amenities.ts src/lib/amenities.test.ts
git commit -m "feat(enrich): premium amenities list and keyword extraction"
```

---

## Task 3: Fokontany (neighborhood) library

**Files:**
- Create: `src/lib/fokontany.ts`
- Test: `src/lib/fokontany.test.ts`

Static data for the main Antananarivo neighborhoods, with `resolveFokontany(lng, lat)` (nearest centroid within its radius) and `matchFokontanyByName(text)` (for NLP/autocomplete). Distance uses the haversine formula. Coordinates are approximate and clearly documented as such.

- [ ] **Step 1: Write the failing test**

Create `src/lib/fokontany.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  FOKONTANY,
  matchFokontanyByName,
  resolveFokontany,
} from "./fokontany";

describe("FOKONTANY data", () => {
  it("has unique names and sane radii", () => {
    const names = new Set(FOKONTANY.map((f) => f.name));
    expect(names.size).toBe(FOKONTANY.length);
    for (const f of FOKONTANY) {
      expect(f.radiusKm).toBeGreaterThan(0);
      expect(f.lat).toBeLessThan(0); // southern hemisphere
    }
  });
});

describe("resolveFokontany", () => {
  it("returns the neighborhood whose centroid is nearest within radius", () => {
    const ivandry = FOKONTANY.find((f) => f.name === "Ivandry")!;
    expect(resolveFokontany(ivandry.lng, ivandry.lat)).toBe("Ivandry");
  });

  it("returns null for a point far from every neighborhood", () => {
    // Far south Madagascar, nowhere near Tana
    expect(resolveFokontany(46.0, -25.0)).toBeNull();
  });
});

describe("matchFokontanyByName", () => {
  it("matches exact name case-insensitively", () => {
    expect(matchFokontanyByName("je cherche à IVANDRY")).toBe("Ivandry");
  });

  it("is accent insensitive", () => {
    expect(matchFokontanyByName("quartier ankorondrano")).toBe("Ankorondrano");
  });

  it("returns null when no neighborhood is named", () => {
    expect(matchFokontanyByName("une maison quelque part")).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test src/lib/fokontany.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/fokontany.ts`**

```ts
/**
 * Antananarivo neighborhoods (fokontany / quartiers). Coordinates are
 * APPROXIMATE centroids (hand-placed from OSM), sufficient for nearest-match
 * resolution, autocomplete, and map layers. Pure module — no DB/network.
 */
export type Fokontany = {
  name: string;
  lng: number;
  lat: number;
  radiusKm: number;
};

export const FOKONTANY: Fokontany[] = [
  { name: "Ivandry", lng: 47.5286, lat: -18.8694, radiusKm: 1.5 },
  { name: "Ankorondrano", lng: 47.5236, lat: -18.8853, radiusKm: 1.5 },
  { name: "Andraharo", lng: 47.5111, lat: -18.8806, radiusKm: 1.5 },
  { name: "Ambohijatovo", lng: 47.5269, lat: -18.9136, radiusKm: 1.2 },
  { name: "Ankadivato", lng: 47.5253, lat: -18.9075, radiusKm: 1.0 },
  { name: "Analakely", lng: 47.5211, lat: -18.9100, radiusKm: 1.0 },
  { name: "Isoraka", lng: 47.5197, lat: -18.9119, radiusKm: 0.9 },
  { name: "Antaninarenina", lng: 47.5244, lat: -18.9089, radiusKm: 0.9 },
  { name: "Ambatobe", lng: 47.5489, lat: -18.8736, radiusKm: 1.5 },
  { name: "Ivato", lng: 47.4789, lat: -18.7969, radiusKm: 2.5 },
  { name: "Tsimbazaza", lng: 47.5256, lat: -18.9242, radiusKm: 1.0 },
  { name: "Andohalo", lng: 47.5314, lat: -18.9203, radiusKm: 0.9 },
];

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Great-circle distance between two lng/lat points, in kilometers. */
export function haversineKm(
  aLng: number,
  aLat: number,
  bLng: number,
  bLat: number,
): number {
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

function fold(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * Resolve a coordinate to the nearest neighborhood whose centroid is within
 * its radius. Returns null if the point falls outside every neighborhood.
 */
export function resolveFokontany(lng: number, lat: number): string | null {
  let best: { name: string; dist: number } | null = null;
  for (const f of FOKONTANY) {
    const dist = haversineKm(lng, lat, f.lng, f.lat);
    if (dist <= f.radiusKm && (best === null || dist < best.dist)) {
      best = { name: f.name, dist };
    }
  }
  return best?.name ?? null;
}

/** Find the first neighborhood named in free text (NLP / autocomplete). */
export function matchFokontanyByName(text: string): string | null {
  const folded = fold(text);
  for (const f of FOKONTANY) {
    if (folded.includes(fold(f.name))) return f.name;
  }
  return null;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test src/lib/fokontany.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/fokontany.ts src/lib/fokontany.test.ts
git commit -m "feat(enrich): Antananarivo fokontany data and resolution"
```

---

## Task 4: Real-cost estimator

**Files:**
- Create: `src/lib/real-cost.ts`
- Test: `src/lib/real-cost.test.ts`

Monthly real-cost estimate for rentals (PRODUCT §4.3 / spec §5.4): displayed rent + estimated water + electricity (by surface tier) + guard (if present) + charges (with a generator-fuel provision). Returns `null` for sales (real-cost is a rental concept). Imports the `Amenity` type from `./amenities`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/real-cost.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test src/lib/real-cost.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/real-cost.ts`**

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test src/lib/real-cost.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/real-cost.ts src/lib/real-cost.test.ts
git commit -m "feat(enrich): rental real-cost estimator"
```

---

## Task 5: Confidence score

**Files:**
- Create: `src/lib/confidence.ts`
- Test: `src/lib/confidence.test.ts`

A pure confidence score (0–100) with an explainable breakdown (PRODUCT §4.1, spec §5.3). It implements only the criteria feasible at MVP, computed from inputs the caller supplies (photo count, surface, fokontany, age, price vs neighborhood median, source count). Criteria that need infrastructure we don't have (perceptual photo-hash originality, phone-number verification) are intentionally OMITTED and the weights are renormalized to sum to 100 over the feasible set.

- [ ] **Step 1: Write the failing test**

Create `src/lib/confidence.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test src/lib/confidence.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/lib/confidence.ts`**

```ts
/**
 * Confidence score (0–100) with an explainable breakdown (PRODUCT §4.1).
 * MVP-feasible criteria only; weights renormalized to sum to 100. Criteria
 * from spec §5.3 that need infrastructure we lack — perceptual photo-hash
 * originality and phone-number verification — are intentionally omitted.
 */
export type ConfidenceKey =
  | "photos"
  | "surface"
  | "fokontany"
  | "recency"
  | "price"
  | "multiSource";

export const CONFIDENCE_WEIGHTS: Record<ConfidenceKey, number> = {
  photos: 20, // at least 4 photos
  surface: 10, // surface present
  fokontany: 15, // neighborhood identified
  recency: 15, // updated within 30 days
  price: 25, // coherent with neighborhood median
  multiSource: 15, // seen on 2+ platforms
};

const LABELS: Record<ConfidenceKey, string> = {
  photos: "Photos suffisantes (4+)",
  surface: "Surface renseignée",
  fokontany: "Quartier identifié",
  recency: "Annonce récente",
  price: "Prix cohérent avec le marché",
  multiSource: "Vu sur plusieurs plateformes",
};

export type ConfidenceInput = {
  photoCount: number;
  surfaceM2: number;
  fokontany: string | null;
  ageDays: number;
  price: number;
  /** Median price for the listing's neighborhood, or null if unknown. */
  neighborhoodMedianPrice: number | null;
  /** Number of distinct platforms this listing was seen on (>= 1). */
  sourceCount: number;
};

export type ConfidenceCheck = {
  key: ConfidenceKey;
  label: string;
  ok: boolean;
  weight: number;
};

export type ConfidenceResult = {
  score: number;
  breakdown: ConfidenceCheck[];
};

/**
 * Price is "coherent" when within 40%–250% of the neighborhood median.
 * If the median is unknown we cannot disprove it, so it passes (neutral).
 */
function priceCoherent(price: number, median: number | null): boolean {
  if (median === null || median <= 0) return true;
  const ratio = price / median;
  return ratio >= 0.4 && ratio <= 2.5;
}

export function computeConfidence(input: ConfidenceInput): ConfidenceResult {
  const checks: Record<ConfidenceKey, boolean> = {
    photos: input.photoCount >= 4,
    surface: input.surfaceM2 > 0,
    fokontany: input.fokontany !== null,
    recency: input.ageDays <= 30,
    price: priceCoherent(input.price, input.neighborhoodMedianPrice),
    multiSource: input.sourceCount >= 2,
  };

  const breakdown: ConfidenceCheck[] = (
    Object.keys(CONFIDENCE_WEIGHTS) as ConfidenceKey[]
  ).map((key) => ({
    key,
    label: LABELS[key],
    ok: checks[key],
    weight: CONFIDENCE_WEIGHTS[key],
  }));

  const score = breakdown.reduce(
    (sum, c) => sum + (c.ok ? c.weight : 0),
    0,
  );

  return { score, breakdown };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test src/lib/confidence.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full suite + typecheck**

Run: `npm test && npx tsc --noEmit`
Expected: all suites PASS, tsc exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/lib/confidence.ts src/lib/confidence.test.ts
git commit -m "feat(enrich): explainable confidence score"
```

---

## Self-Review

**Spec coverage (vs M2a portion of the M2 spec):**
- `src/lib/amenities.ts` (canonical list + FR labels + extraction) → Task 2. ✓
- `src/lib/fokontany.ts` (data + resolution + name match) → Task 3. ✓
- `src/lib/real-cost.ts` (estimateRealCost per §5.4) → Task 4. ✓
- `src/lib/confidence.ts` (computeConfidence per §5.3, feasible subset documented) → Task 5. ✓
- Test harness (none existed) → Task 1. ✓
- Schema/migration + pipeline wiring + validation/UI → intentionally deferred to the **M2b** plan (these depend on these libs and touch the DB). ✓

**Placeholder scan:** No TBD/TODO; every test and implementation is concrete and complete.

**Type consistency:** `Amenity` is defined in `amenities.ts` (Task 2) and imported by `real-cost.ts` (Task 4). `ConfidenceKey` is the shared key type across `CONFIDENCE_WEIGHTS`, `LABELS`, `ConfidenceCheck.key`, and tests. `RealCostInput.transactionType` uses the same `"sale" | "rent"` literal as the DB `transaction_type` enum (M2b will pass the enum value directly — assignable). `resolveFokontany`/`matchFokontanyByName` return `string | null`, matching how M2b stores `fokontany text` (nullable).

**Decomposition note:** Each library is independently importable with no cross-dependencies except `real-cost` → `amenities` (type only). None import DB/network/React, so all are unit-testable in isolation, as required.
