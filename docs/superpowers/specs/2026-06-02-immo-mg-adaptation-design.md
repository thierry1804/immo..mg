# Spec — Adapter GeoMarket vers la vision immo·mg

> Design validé le 2026-06-02. Périmètre : refonte visuelle immo·mg + enrichissement MVP + recherche IA conversationnelle (OpenAI) + compatibilité déclarée. Carte : MapLibre+OSM restylée (pas de migration Mapbox).

## Context

Le dépôt contient **GeoMarket** : une app Next.js 16 / React 19 fonctionnelle (carte MapLibre+OSM, PostGIS+Drizzle, pipeline de scraping CoinAfrique réel avec normalisation/dédup/géocodage, auth par session, CRUD annonces, admin sources + modération). Mais elle est habillée génériquement (Tailwind zinc + police Geist).

Trois documents (`plateforme-immo-madagascar.md`, `DESIGN.md`, `PRODUCT.md`) décrivent **immo·mg** : un agrégateur immobilier premium pour la classe aisée malgache — design navy/or éditorial, attributs premium, score de confiance, estimateur de coût réel, recherche IA conversationnelle, compatibilité personnalisée. Les assets de maquette cités dans DESIGN.md (`Immo MG.html`, `immo.css`, `screens-*.jsx`) **n'existent pas** dans le dépôt — seules les specs existent.

**Objectif de cette itération** :
1. **Refonte visuelle** complète vers le design system immo·mg, en réutilisant les écrans/données existants.
2. **Enrichissement MVP des données** : attributs premium, fokontany, score de confiance, estimateur de coût réel, dédup multi-sources « Vu sur N plateformes ».
3. **Recherche IA conversationnelle** (OpenAI GPT-4o-mini, extraction d'entités FR → filtres).
4. **Compatibilité déclarée** : table de profil + anneau de compatibilité (sans apprentissage implicite).
5. **Carte** : on garde MapLibre+OSM et on la restyle (navy/or, étiquettes prix, couche fokontany).

Hors périmètre : compatibilité inférée/comportementale + cold-start complet, analyse vision des photos, home staging, conciergerie, espace investisseur, abonnements/paiement.

> **Préalable (AGENTS.md)** : Next.js customisé avec breaking changes — lire `node_modules/next/dist/docs/` avant d'écrire du code Next.js. Tailwind v4 est piloté par CSS (`@theme` dans `globals.css`).

## Milestones

### M1 — Design system immo·mg
- `src/app/globals.css` : tokens `.immo` (navy/gold/paper/line/ink, present/absent oklch) mappés en couleurs Tailwind via `@theme` ; rayons, ombres navy, `.pad`.
- `src/app/layout.tsx` : Playfair Display (titres) + Hanken Grotesk (UI) via `next/font/google` ; header navy/or + wordmark ; TabBar mobile (Rechercher · Carte · Chat · Profil).
- `src/components/immo/Ico.tsx` : icônes trait unique (DESIGN §5).

### M2 — Enrichissement données (schéma + pipeline)
- Migration `0004_immo_enrichment.sql` + `src/db/schema.ts` — sur `listings` : `fokontany`, `amenities text[]` (GIN), `confidence_score`, `confidence_breakdown jsonb`, `price_per_sqm`, `estimated_real_cost`, `canonical_id`, `sources jsonb`, `is_duplicate`, `last_seen_at`.
- `src/lib/amenities.ts` : liste canonique (`guard,generator,cistern,parking,gated,paved,ac,fiber,pool`) + libellés FR + extraction par mots-clés.
- `src/lib/fokontany.ts` : quartiers de Tana (nom, centroïde, rayon) ; résolution, autocomplétion, couche carte, bandeau marché.
- `src/lib/confidence.ts` : `computeConfidence` (sous-ensemble réaliste §5.3 ; pHash/vérif numéro omis et documentés).
- `src/lib/real-cost.ts` : `estimateRealCost` (§5.4 ; disclaimer « estimation »).
- Pipeline : `src/scrapers/{types,normalize,upsert}.ts` (+amenities/fokontany ; dédup multi-sources via `ST_DWithin` ~150 m + prix ±5% + surface ±10% → `canonical_id`/`sources`).
- `src/lib/validation.ts` : `listingInputSchema` +amenities ; `listingsQuerySchema` +amenities/+fokontany/+sort.

### M3 — Restyle écrans en composants signature
- `src/components/immo/PropertyCard.tsx` (remplace `ListingCard`), `ConfidenceBar`, `CompatibilityRing`, `RealCostEstimator`, `AmenityTag`.
- `src/app/listings/[id]/page.tsx` : écran Détail (anneau + coût réel + confiance + sources + CTA ; placeholders `.ph`).
- `src/components/HomeView.tsx` + `Map.tsx` : carte navy/or, top match or, étiquettes prix, couche fokontany translucide, toggles couches, bottom-sheet trié.
- `src/components/FiltersPanel.tsx` : chips rapides + tri.

### M4 — Recherche IA conversationnelle (OpenAI)
- `src/lib/llm/openai.ts` : client lazy (`OPENAI_API_KEY`), `gpt-4o-mini`, `response_format: json_schema` ; fallback regex sans clé.
- `src/app/api/search/conversational/route.ts` : POST `{query,history?}` → `{filters, clarification?, summary}`.
- `src/components/immo/{ChatPanel,ChatFab}.tsx` ; hero Accueil (barre conversationnelle + bandeau marché + chips).
- `src/app/chat/page.tsx` ; `.env.example` +`OPENAI_API_KEY`.

### M5 — Compatibilité déclarée + profil
- Migration `0005_user_profiles.sql` — table `user_profiles` (budget, transaction, quartiers, must-have, types, min surface, seuil alerte).
- `src/lib/compatibility.ts` : `computeCompatibility` (budget .33 / loc .28 / équip .22 / type+surface .17) ; pas d'anneau sans profil.
- `src/app/preferences/page.tsx` + `/api/user/profile` (GET/PUT).
- `src/app/api/listings/route.ts` : compatibilité par annonce + `sort=compat` + top match si profil.

### M6 — Bandeau marché + comparaison
- `src/app/api/market/summary/route.ts` : médiane prix/m² par fokontany (`percentile_cont`) + count ; tendance 30j si possible.
- `src/components/immo/MarketBand.tsx`.
- `src/components/immo/CompareBar.tsx` + `src/app/compare/page.tsx` : jusqu'à 3 biens, meilleure cellule surlignée.

## Réutilisé
Pipeline scraping (`registry.ts`, `dynamic.ts`, `geocode.ts`), `geographyPoint` + `ST_DWithin`/`ST_Intersects`, `getCurrentSession`, `formatPrice`/`shortPriceLabel`, worker BullMQ.

## Vérification
- Migrations : `npm run db:generate` → `npm run db:migrate` ; index GIN amenities visible dans `db:studio`.
- Pipeline : `npm run scrape:once coinafrique` → amenities/fokontany/scores peuplés ; dédup lie `canonical_id`/`sources`.
- Tests unitaires (fonctions pures, TDD) : amenities, confidence, real-cost, compatibility, fokontany.
- Visuel : `npm run dev` → Accueil/Résultats/Détail/Chat/Préférences/Comparaison ; polices + palette correctes.
- Conversationnel : avec clé → extraction correcte ; sans clé → fallback regex.
- Compatibilité : sans profil = confiance seule ; avec profil = anneau + tri compat.
- `npm run build` passe.
