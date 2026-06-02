# Handoff — immo·mg adaptation

_Last updated 2026-06-02. Branch `worktree-immo-mg` (git worktree `.claude/worktrees/immo-mg`). Nothing merged to `main` yet — milestones are stacked on this branch and merged later._

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
| M3 | Restyle screens into signature components | **TODO** (next) |
| M4 | Conversational search (OpenAI gpt-4o-mini + regex fallback) | TODO |
| M5 | Declared-compatibility profile | TODO |
| M6 | Market band + comparison | TODO |

## Deferred follow-ups (pick up during M3+)

1. **Canonical-confidence recompute** — when a source is appended to a canonical listing during dedup, the canonical's `confidence_score` is not recomputed, so its multi-source credit lags until its next update. Recompute on append.
2. **`/?view=map` TabBar active-state** — the Map tab does not reflect active state when the map view is opened via the `view=map` query param.

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

- `npm test` — unit tests for pure libs.
- `npm run db:generate` → `npm run db:migrate` — migrations.
- `npm run scrape:once coinafrique` — pipeline (amenities/fokontany/scores populated; dedup links `canonical_id`/`sources`).
- `npm run dev` — visual check of Accueil / Résultats / Détail / Chat / Préférences / Comparaison.
- `npm run build` — must pass.
