# Milestone 2b — Enrichment Schema + Scraper Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Persist the immo·mg enrichment on listings (fokontany, premium amenities, confidence score, price/m², estimated real cost, cross-source dedup) by adding a DB migration and wiring the M2a pure libraries into the scraper normalize/upsert pipeline and the user-create API path.

**Architecture:** A Drizzle migration `0004` adds enrichment columns to `listings`. The scraper `normalize` step extracts amenities (from `src/lib/amenities.ts`) and resolves fokontany (from `src/lib/fokontany.ts`). The `upsert` step computes price/m², estimated real cost (`src/lib/real-cost.ts`) and confidence (`src/lib/confidence.ts`), and performs cross-source deduplication using PostGIS `ST_DWithin`: a new listing within ~150 m of an existing active/pending listing of the same transaction type with price ±5% and surface ±10% is linked to that canonical listing (`canonical_id`, `is_duplicate=true`) and its source is appended to the canonical's `sources` array. The user-create API path computes the same enrichment for manually-entered listings.

**Tech Stack:** Drizzle ORM 0.45 + Postgres 16/PostGIS, TypeScript, the M2a libs.

> **Preconditions:** A reachable Postgres+PostGIS (via `.env.local` `DATABASE_URL`) and Redis. M2a libs (`amenities`, `fokontany`, `real-cost`, `confidence`) exist and are tested. The current DB has migrations 0000–0003 applied (listings lacks enrichment columns).

> **Read before coding (AGENTS.md):** customized Next.js — but this milestone is Drizzle/SQL + Node pipeline + one API route handler. Confirm any unfamiliar Next route-handler API against `node_modules/next/dist/docs/` if touched.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/db/migrations/0004_immo_enrichment.sql` (create) | Add enrichment columns + GIN index on amenities to `listings`. |
| `src/db/schema.ts` (modify) | Mirror the new columns in the Drizzle `listings` table. |
| `src/scrapers/types.ts` (modify) | Add `amenities` + `fokontany` to `NormalizedListing`. |
| `src/scrapers/normalize.ts` (modify) | Extract amenities + resolve fokontany during normalization. |
| `src/scrapers/enrich.ts` (create) | Shared enrichment helpers: price/m², real cost, neighborhood median, confidence assembly. |
| `src/scrapers/upsert.ts` (modify) | Compute enrichment + cross-source dedup on insert/update. |
| `src/lib/validation.ts` (modify) | `listingInputSchema` += amenities; `listingsQuerySchema` += amenities/fokontany/sort. |
| `src/app/api/listings/route.ts` (modify) | POST computes enrichment for user listings; (GET filter changes are M3). |
| `src/scrapers/enrich.test.ts` (create) | Unit tests for the pure parts of enrich.ts (price/m², dedup-match predicate). |

---

## Task 1: Schema + generated migration

> **Migration convention (verified):** this repo uses Drizzle's journal-tracked
> migrations with custom `--name` tags and per-migration snapshots in
> `src/db/migrations/meta/`. The correct workflow is: edit `schema.ts`, then
> `drizzle-kit generate --name immo_enrichment` (auto-creates the `.sql`,
> updates `_journal.json` and writes `0004_snapshot.json`), then `db:migrate`.
> Do NOT hand-author the SQL or the journal entry — let `generate` do it, then
> review the emitted SQL.

**Files:**
- Modify: `src/db/schema.ts`
- Generated: `src/db/migrations/0004_immo_enrichment.sql` + `meta/0004_snapshot.json` + `meta/_journal.json`

- [ ] **Step 1: Add the columns + GIN index in `src/db/schema.ts`**

In the `listings` table definition, add these columns (after `rawHash`, before `createdAt`). `jsonb`, `bigint`, `boolean`, `integer`, `text`, `timestamp`, `index` are already imported. `canonicalId` is a plain `text` column (no Drizzle self-FK, to avoid circular-type friction; dedup sets it to a valid existing id):

```ts
    fokontany: text("fokontany"),
    amenities: text("amenities").array().notNull().default([]),
    confidenceScore: integer("confidence_score"),
    confidenceBreakdown: jsonb("confidence_breakdown").$type<
      { key: string; label: string; ok: boolean; weight: number }[]
    >(),
    pricePerSqm: bigint("price_per_sqm", { mode: "number" }),
    estimatedRealCost: bigint("estimated_real_cost", { mode: "number" }),
    canonicalId: text("canonical_id"),
    sources: jsonb("sources")
      .$type<{ source: string; url: string | null }[]>()
      .notNull()
      .default([]),
    isDuplicate: boolean("is_duplicate").notNull().default(false),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
```

Add a GIN index to the table's index callback array (alongside the existing `listings_location_idx`):

```ts
    index("listings_amenities_idx").using("gin", t.amenities),
```

- [ ] **Step 2: Generate the migration from the schema**

Run: `npm run db:generate -- --name immo_enrichment`
Expected: creates `src/db/migrations/0004_immo_enrichment.sql`, writes `meta/0004_snapshot.json`, and appends a `0004_immo_enrichment` entry to `meta/_journal.json`.

- [ ] **Step 3: Review the generated SQL, then apply it**

Open `src/db/migrations/0004_immo_enrichment.sql` and confirm it contains `ADD COLUMN` for all ten columns and a `CREATE INDEX ... USING gin ("amenities")`. (Drizzle emits `text[] DEFAULT '{}'` for the array and `jsonb DEFAULT '[]'`/`'{}'` for the jsonb defaults.) If the GIN index is missing, the `.using("gin", t.amenities)` index entry in schema.ts was not added correctly — fix schema.ts and regenerate.

Run: `npm run db:migrate`
Expected: migration `0004_immo_enrichment` applied, no errors.

- [ ] **Step 4: Verify columns + indexes exist**

Run (from worktree):
```bash
node --env-file=.env.local -e 'const{Client}=require("pg");(async()=>{const c=new Client({connectionString:process.env.DATABASE_URL});await c.connect();const cols=await c.query("select column_name from information_schema.columns where table_name=\047listings\047");const idx=await c.query("select indexname from pg_indexes where tablename=\047listings\047");console.log("cols:",cols.rows.map(r=>r.column_name).join(", "));console.log("idx:",idx.rows.map(r=>r.indexname).join(", "));await c.end();})()'
```
Expected: includes `fokontany, amenities, confidence_score, confidence_breakdown, price_per_sqm, estimated_real_cost, canonical_id, sources, is_duplicate, last_seen_at` and `listings_amenities_idx`.

- [ ] **Step 5: Typecheck + commit**

Run: `npx tsc --noEmit` (exit 0).
```bash
git add src/db/schema.ts src/db/migrations/0004_immo_enrichment.sql src/db/migrations/meta/_journal.json src/db/migrations/meta/0004_snapshot.json
git commit -m "feat(db): enrichment columns on listings (migration 0004)"
```

---

## Task 2: Normalize — amenities + fokontany

**Files:**
- Modify: `src/scrapers/types.ts`
- Modify: `src/scrapers/normalize.ts`

- [ ] **Step 1: Extend `NormalizedListing` in `src/scrapers/types.ts`**

Add to the `NormalizedListing` type:

```ts
  amenities: import("@/lib/amenities").Amenity[];
  fokontany: string | null;
```

(Or add a top-of-file `import type { Amenity } from "@/lib/amenities";` and use `amenities: Amenity[];`.)

- [ ] **Step 2: Wire extraction + resolution into `normalizeListing`**

In `src/scrapers/normalize.ts`, import the libs and populate the new fields. After the existing `const coord = await geocode(raw.rawAddress); if (!coord) return null;` block, compute:

```ts
import { extractAmenities } from "@/lib/amenities";
import { resolveFokontany } from "@/lib/fokontany";
// ...
  const amenities = extractAmenities(`${raw.title} ${raw.description}`);
  const fokontany = resolveFokontany(coord.lng, coord.lat);
```

And add `amenities,` and `fokontany,` to the returned object.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0 (every `NormalizedListing` producer now must supply the fields — only `normalize.ts` constructs them, so this should pass once updated).

- [ ] **Step 4: Commit**

```bash
git add src/scrapers/types.ts src/scrapers/normalize.ts
git commit -m "feat(scrape): extract amenities and resolve fokontany in normalize"
```

---

## Task 3: Enrichment helpers + dedup in upsert

**Files:**
- Create: `src/scrapers/enrich.ts`
- Test: `src/scrapers/enrich.test.ts`
- Modify: `src/scrapers/upsert.ts`

- [ ] **Step 1: Write failing tests for the pure helpers**

Create `src/scrapers/enrich.test.ts`:

```ts
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
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test src/scrapers/enrich.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/scrapers/enrich.ts`**

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test src/scrapers/enrich.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire enrichment + dedup into `src/scrapers/upsert.ts`**

Augment the INSERT branch (new `(source, externalId)`):

1. Before inserting, find a spatial dedup candidate. Query active/pending listings within 150 m of `(n.lng, n.lat)` that are NOT already duplicates (canonical only), then apply `isLikelyDuplicate`:

```ts
import { sql } from "drizzle-orm";
import { isLikelyDuplicate, pricePerSqm } from "./enrich";
import { computeConfidence } from "@/lib/confidence";
import { estimateRealCost } from "@/lib/real-cost";
// ...
const nearby = await db
  .select({
    id: listings.id,
    transactionType: listings.transactionType,
    price: listings.price,
    surfaceM2: propertyDetails.surfaceM2,
    sources: listings.sources,
  })
  .from(listings)
  .innerJoin(propertyDetails, eq(propertyDetails.listingId, listings.id))
  .where(
    and(
      eq(listings.isDuplicate, false),
      sql`ST_DWithin(${listings.location}, ST_SetSRID(ST_MakePoint(${n.lng}, ${n.lat}), 4326)::geography, 150)`,
    ),
  );
const canonical = nearby.find((c) =>
  isLikelyDuplicate(
    { transactionType: c.transactionType, price: c.price, surfaceM2: c.surfaceM2 },
    { transactionType: n.transactionType, price: n.price, surfaceM2: n.surfaceM2 },
  ),
);
```

2. Compute the neighborhood median for confidence (rent listings in the same fokontany):

```ts
async function neighborhoodMedian(
  fokontany: string | null,
  txn: "sale" | "rent",
): Promise<number | null> {
  if (!fokontany) return null;
  const r = await db
    .select({
      median: sql<number | null>`percentile_cont(0.5) within group (order by ${listings.price})`,
    })
    .from(listings)
    .where(
      and(eq(listings.fokontany, fokontany), eq(listings.transactionType, txn)),
    );
  return r[0]?.median ?? null;
}
```

3. Build the enrichment payload and store it on the new listing:

```ts
const sourceCount = canonical ? (canonical.sources?.length ?? 1) + 1 : 1;
const median = await neighborhoodMedian(n.fokontany, n.transactionType);
const { score, breakdown } = computeConfidence({
  photoCount: n.imageUrls.length,
  surfaceM2: n.surfaceM2,
  fokontany: n.fokontany,
  ageDays: 0,
  price: n.price,
  neighborhoodMedianPrice: median,
  sourceCount,
});
const realCost = estimateRealCost({
  price: n.price,
  transactionType: n.transactionType,
  surfaceM2: n.surfaceM2,
  amenities: n.amenities,
});
```

Add to the `tx.insert(listings).values({...})`:
```ts
  fokontany: n.fokontany,
  amenities: n.amenities,
  confidenceScore: score,
  confidenceBreakdown: breakdown,
  pricePerSqm: pricePerSqm(n.price, n.surfaceM2),
  estimatedRealCost: realCost?.total ?? null,
  canonicalId: canonical ? canonical.id : null,
  isDuplicate: canonical ? true : false,
  sources: [{ source: n.source, url: n.externalUrl }],
  lastSeenAt: new Date(),
```

4. If `canonical` exists, after inserting, append this source to the canonical and bump its multi-source confidence:

```ts
if (canonical) {
  await db
    .update(listings)
    .set({
      sources: sql`${listings.sources} || ${JSON.stringify([{ source: n.source, url: n.externalUrl }])}::jsonb`,
    })
    .where(eq(listings.id, canonical.id));
}
```

In the UPDATE branch (changed `rawHash`), also refresh `amenities`, `fokontany`, `pricePerSqm`, `estimatedRealCost`, `confidenceScore`, `confidenceBreakdown`, and `lastSeenAt` using the same computation (recompute median + confidence for the existing row; sourceCount = current `sources.length`). Keep the existing photo-replacement logic.

- [ ] **Step 6: Typecheck + run unit tests**

Run: `npx tsc --noEmit && npm test`
Expected: tsc exit 0; all unit suites pass (enrich + M2a libs).

- [ ] **Step 7: Commit**

```bash
git add src/scrapers/enrich.ts src/scrapers/enrich.test.ts src/scrapers/upsert.ts
git commit -m "feat(scrape): enrichment + cross-source dedup in upsert"
```

---

## Task 4: Validation + user-create enrichment

**Files:**
- Modify: `src/lib/validation.ts`
- Modify: `src/app/api/listings/route.ts`

- [ ] **Step 1: Extend validation schemas**

In `src/lib/validation.ts`, import the amenity list and add fields:

```ts
import { AMENITIES } from "./amenities";

const amenityEnum = z.enum(AMENITIES);
```

Add to `listingInputSchema`:
```ts
  amenities: z.array(amenityEnum).max(AMENITIES.length).default([]),
```

Add to `listingsQuerySchema`:
```ts
  amenities: z.string().optional(), // CSV of amenity keys, parsed in the route
  fokontany: z.string().max(100).optional(),
  sort: z
    .enum(["relevance", "price_asc", "price_desc", "surface", "confidence", "compat"])
    .optional(),
```

- [ ] **Step 2: Compute enrichment in the POST handler**

In `src/app/api/listings/route.ts` POST, after parsing `input` and before/within the insert transaction, compute fokontany + amenities-driven enrichment for the user listing (reuse the libs):

```ts
import { resolveFokontany } from "@/lib/fokontany";
import { computeConfidence } from "@/lib/confidence";
import { estimateRealCost } from "@/lib/real-cost";
import { pricePerSqm } from "@/scrapers/enrich";
// ...
const fokontany = resolveFokontany(input.lng, input.lat);
const realCost = estimateRealCost({
  price: input.price,
  transactionType: input.transactionType,
  surfaceM2: input.surfaceM2,
  amenities: input.amenities,
});
const { score, breakdown } = computeConfidence({
  photoCount: input.photoPaths.length,
  surfaceM2: input.surfaceM2,
  fokontany,
  ageDays: 0,
  price: input.price,
  neighborhoodMedianPrice: null,
  sourceCount: 1,
});
```

Add to `tx.insert(listings).values({...})`: `fokontany`, `amenities: input.amenities`, `confidenceScore: score`, `confidenceBreakdown: breakdown`, `pricePerSqm: pricePerSqm(input.price, input.surfaceM2)`, `estimatedRealCost: realCost?.total ?? null`, `sources: [{ source: "user", url: null }]`, `lastSeenAt: new Date()`.

> The new-listing FORM amenity checkboxes are part of Milestone 3 (UI restyle). For now `amenities` defaults to `[]` when the form does not send it — the schema's `.default([])` handles that.

- [ ] **Step 3: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: tsc exit 0; build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/lib/validation.ts src/app/api/listings/route.ts
git commit -m "feat(api): amenities/fokontany validation + user-listing enrichment"
```

---

## Task 5: Live end-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Confirm migration is applied** (done in Task 1) and the unit suite is green: `npm test`.

- [ ] **Step 2: Run a bounded scrape**

Ensure Redis is running and a worker can process, OR run the scrape path directly. With the existing job system:
```bash
COINAFRIQUE_MAX_PAGES=1 npm run scrape:once coinafrique
# then run the worker briefly to process the queued job, or run an inline scrape script
```

> If running the BullMQ worker is impractical for a one-shot check, add a TEMPORARY throwaway script that imports the coinafrique scraper + `normalizeListing` + `upsertScrapedListing` for ~5 listings, runs it, then is deleted (do not commit it). This exercises the full enrichment + dedup path without Redis.

- [ ] **Step 3: Inspect enriched rows**

```bash
node --env-file=.env.local -e 'const{Client}=require("pg");(async()=>{const c=new Client({connectionString:process.env.DATABASE_URL});await c.connect();const r=await c.query("select title, fokontany, amenities, confidence_score, price_per_sqm, estimated_real_cost, is_duplicate, jsonb_array_length(sources) as n_sources from listings where source <> \047user\047 order by scraped_at desc nulls last limit 10");console.table(r.rows);const d=await c.query("select count(*) filter (where is_duplicate) as dups, count(*) total from listings");console.log(d.rows[0]);await c.end();})()'
```
Expected: scraped rows have non-null `confidence_score` and `price_per_sqm` (when surface present), `amenities` arrays populated where the text mentioned them, `fokontany` set for in-Tana coordinates, and `sources` length ≥ 1. Any detected duplicates have `is_duplicate=true` and a `canonical_id`.

- [ ] **Step 4: Report** the row sample and the duplicate count. No commit (verification only).

---

## Self-Review

**Spec coverage (M2b portion):**
- Migration 0004 with all enrichment columns + GIN amenities index → Task 1. ✓
- `NormalizedListing` + normalize extract amenities/resolve fokontany → Task 2. ✓
- upsert computes price/m², real cost, confidence; cross-source dedup via ST_DWithin + sources aggregation → Task 3. ✓
- Validation (amenities/fokontany/sort) + user-create enrichment → Task 4. ✓
- Live migrate + scrape verification → Task 5. ✓
- GET filtering by amenities/fokontany/sort wiring in the listings route and the new-listing amenity UI → deferred to M3 (display/filter milestone), noted in Tasks 4 & 5.

**Placeholder scan:** none — all SQL/TS shown. The one throwaway verification script (Task 5) is explicitly temporary and uncommitted.

**Type consistency:** `Amenity[]` flows types.ts → normalize → upsert → schema `amenities text[]`. `confidenceBreakdown` jsonb `$type` matches `ConfidenceCheck` shape from `confidence.ts` (`{key,label,ok,weight}`). `pricePerSqm`/`estimateRealCost` consumed in both upsert and the API POST. `sources` jsonb `$type` `{source,url}[]` matches what both insert paths write.
