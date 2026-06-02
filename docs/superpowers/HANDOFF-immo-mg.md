# Handoff — immo·mg adaptation

_Last updated 2026-06-02. Branch `worktree-immo-mg` (git worktree `.claude/worktrees/immo-mg`). **All six milestones (M1–M6) are complete** and stacked on this branch — nothing merged to `main` yet. Next step is integration (merge/PR)._

## What this is

GeoMarket (Next 16 / React 19, Tailwind v4, Drizzle + Postgres/PostGIS, BullMQ+Redis scraping, MapLibre GL) is being adapted into **immo·mg**, a premium real-estate aggregator for affluent Antananarivo. Source of truth:

- `DESIGN.md`, `PRODUCT.md`, `plateforme-immo-madagascar.md` — product/design vision.
- `docs/superpowers/specs/2026-06-02-immo-mg-adaptation-design.md` — the validated spec (6 milestones).
- `docs/superpowers/plans/` — per-milestone implementation plans (M1, M2a, M2b written).

## Status

| Milestone | Scope | State |
|-----------|-------|-------|
| M1 | Design system: navy/gold tokens, Playfair/Hanken fonts, header, TabBar, `Ico` | **DONE** |
| M2a | Pure enrichment libs: `amenities`, `fokontany`, `real-cost`, `confidence` + vitest | **DONE** |
| M2b | Migration `0004` (fokontany, amenities[], confidence, price_per_sqm, estimated_real_cost, canonical_id, sources, is_duplicate) + scraper normalize/upsert dedup (ST_DWithin) + validation/create-path | **DONE** (migration applied to live DB; enrichment + dedup verified end-to-end) |
| M3 | Signature components (PropertyCard, ConfidenceBar, CompatibilityRing, RealCostEstimator, AmenityTag) + restyled detail/HomeView/Map (fokontany layer)/Filters | **DONE** |
| M4 | Conversational search: `extract-filters` (rule-based, tested) + `llm/openai` (gpt-4o-mini via fetch, json_schema, regex fallback), `/api/search/conversational`, ConversationalBar, ChatPanel, `/chat`, ChatFab | **DONE** |
| M5 | Declared compatibility: `compatibility.ts` (tested), `user_profiles` + migration 0005, GET/PUT `/api/user/profile`, `/preferences`, per-listing compat + `sort=compat` + compat top-match + detail ring | **DONE** |
| M6 | Market band + comparison: `/api/market/summary` (median price/m² + trend), MarketBand, `/api/listings/compare`, `useCompare` + CompareBar + `/compare` (best-cell highlight) | **DONE** |

## Deferred follow-ups — both RESOLVED in M3

1. ~~Canonical-confidence recompute on dedup append~~ — done via `markConfidenceCheck`/`scoreFromBreakdown` (tested) wired into `scrapers/upsert.ts`.
2. ~~`/?view=map` TabBar active-state~~ — done via `useSearchParams` (Suspense-wrapped TabBar).

## Key decisions (with the user)

- Keep MapLibre + OSM (restyle only — no Mapbox migration).
- OpenAI for NLP (not Anthropic).
- Include a simple **declared** compatibility profile (M5); no implicit/behavioral learning.
- Tweaks panel deferred (out of scope).

## Conventions / gotchas

- This repo's Next.js (16.2.7) is described as customized — read the bundled guide in `node_modules/next/dist/docs/` before writing Next.js code. In practice standard Next 16 App Router APIs have held (verified for M1).
- Tailwind v4 is CSS-first: tokens live in `src/app/globals.css` via `@theme inline`.
- Path alias `@` → `src`. Tests: `npm test` (vitest). Pure libs avoid DB/network/React imports.
- **M2b onward needs a live Postgres+PostGIS (`DATABASE_URL`) and Redis** for migration/scrape verification — confirm availability before `db:migrate` / `scrape:once`.

## Verification

- `npm test` — 67 unit tests (amenities, confidence, fokontany incl. GeoJSON, real-cost, extract-filters, compatibility) pass.
- `npm run build` — passes (24 routes).
- `npm run db:generate` → `npm run db:migrate` — migrations (0005 applied to live DB).
- `npm run db:backfill` — **new**: deterministically enriches pre-pipeline listings from the pure libs (no network). Was applied to the live DB (68 rows) so the signature UI has data; safe/idempotent to re-run.
- `npm run scrape:once coinafrique` — pipeline (amenities/fokontany/scores; dedup links `canonical_id`/`sources` and recomputes the canonical's confidence).
- `npm run dev` — Accueil / Résultats / Détail / Chat / Préférences / Comparaison. Conversational search + compatibility + market + compare endpoints verified live this session.

## Notes for whoever merges

- Conversational search runs in **fallback (rule-based) mode** until `OPENAI_API_KEY` is set — verified working without a key.
- A throwaway dev account (`m5test+…@example.com`) with a saved profile exists in the dev DB from M5 verification; harmless, delete if undesired.
- The build emits a benign "multiple lockfiles" warning because the worktree sits under the main repo; not an error.
