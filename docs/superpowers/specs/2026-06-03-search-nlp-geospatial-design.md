# Amélioration de la recherche NLP & géospatiale — Design

Date : 2026-06-03
Statut : approuvé (cadrage), en attente de revue du spec

## Contexte

La recherche actuelle transforme une requête FR en **filtres structurés**
(`extract-filters.ts`, `openai.ts`) puis applique ces filtres comme des `WHERE`
binaires (`/api/listings`). Deux manques de fond :

1. **Aucun classement par pertinence.** Le tri `relevance` = `createdAt desc`
   (`src/app/api/listings/route.ts:95`). Les biens dans un rayon ne sont pas
   triés par distance, et la distance n'est pas renvoyée.
2. **Le texte libre est jeté.** Seul `excludeTitleContains` (un `NOT ILIKE`,
   `src/lib/listing-text-filter.ts`) touche au texte. Les mots non structurés
   (« lumineux », « proche école », « meublé ») n'influencent rien. `title` et
   `description` ne sont jamais lus pour matcher/classer.

Autres défauts ciblés : hint maison/villa trop agressif
(`src/lib/search-anchor.ts:39` force `excludeTitleContains: "villa"`),
géocodage Nominatim mono-coup non biaisé (`src/scrapers/geocode.ts`),
matching fokontany exact (zéro tolérance fautes), pas de cache des appels NLP.

### Contraintes d'environnement (vérifiées)

- Postgres 16.4, **PostGIS 3.4.3 installé**.
- **`pg_trgm` et `unaccent` disponibles** (installables), **pas `pgvector`**.
- `OPENAI_API_KEY` déjà utilisé (gpt-4o-mini pour l'extraction de filtres).
- `REDIS_URL` / ioredis déjà présents.
- **129 annonces** en base → similarité cosinus en force brute = instantanée.
- DB accessible depuis l'environnement de dev → migrations et requêtes testées
  en réel.

## Approche

Tout en Postgres (alternatives Meilisearch/Typesense et tri applicatif écartées :
infra à synchroniser / perte des index pour un volume de 129 lignes). Les
**filtres structurés restent des `WHERE` durs** (prix, type, txn, rayon) ; le
**texte (lexical + sémantique) devient du classement**, pas du filtrage, avec un
plancher de pertinence pour les requêtes purement textuelles. Le texte libre de
la requête est **conservé** et transmis au ranking au lieu d'être supprimé.

## Décisions verrouillées

- Sémantique **incluse**, **sans pgvector** : embedding stocké en colonne, cosinus
  brute-force. Interface conçue pour basculer vers pgvector plus tard sans changer
  l'API publique.
- Modèle d'embedding : OpenAI `text-embedding-3-small` (1536 dims).
- Génération d'embedding **à l'écriture** (POST listing + enrich scrapers) +
  **script de backfill** pour l'existant.
- Dégradation propre : sans `OPENAI_API_KEY`, la sémantique est désactivée, le
  lexical + géo + confiance + fraîcheur continuent de fonctionner.
- Pondérations de départ (réglables via constantes) :
  sémantique **0.35** / lexical **0.25** / proximité géo **0.20** /
  confiance **0.10** / fraîcheur **0.10**.

## Lots (chacun livrable & testable indépendamment)

### Lot 1 — Géo : tri & score par distance + fix villa

- `listing-geo-filter.ts` : ajouter un helper renvoyant l'expression
  `ST_Distance(location, point)::… ` (en mètres) quand un centre + rayon sont
  actifs, pour usage en `SELECT` et `ORDER BY`.
- `/api/listings` : sélectionner `distanceM` quand un centre est défini, et,
  pour `sort=relevance` **avec rayon**, trier par distance croissante (avant le
  score hybride du Lot 5). Renvoyer `distanceM` au client.
- `search-anchor.ts` `applyMaisonVillaHint` : ne **plus** poser
  `excludeTitleContains: "villa"` ; se limiter à `propertyType: "house"`.
  Mettre à jour les tests existants.
- Tests : `listing-geo-filter.test.ts` (déjà présent) étendu ; cas « maison »
  ne renvoie plus d'exclusion titre.

### Lot 2 — Géocodage robuste + fuzzy fokontany

- `geocode.ts` / `geocodePlace` : ajouter `viewbox` (bounding box Grand
  Antananarivo) + `bounded=1`, demander `addressdetails`/`importance`, et
  **rejeter** un résultat dont l'`importance` est sous un seuil ou dont le type
  est manifestement hors zone. Conserver le cache DB+mémoire et le throttle 1/s.
- `fokontany.ts` : `matchFokontanyByName` tolérant aux fautes via distance de
  Levenshtein **en module pur** (pas d'aller DB — `fokontany.ts` reste un module
  sans réseau, cohérent avec son rôle actuel). Seuil de similarité conservateur
  pour éviter les faux matchs. « Analakely » mal orthographié → match.
  (`pg_trgm` reste réservé au full-text/recherche texte du Lot 3.)
- Tests : viewbox appliqué, rejet d'un faux positif, fuzzy fokontany.

### Lot 3 — Full-text FR

- Migration : `CREATE EXTENSION IF NOT EXISTS unaccent;` + une config de
  recherche `french` insensible aux accents (via `unaccent` dans une fonction
  d'indexation ou une config TS dédiée).
- Schéma `listings` : colonne générée `search_vector tsvector`
  (`title` poids A, `description` poids B, `address` poids C) + index GIN.
- Helper `listing-text-search.ts` : construit la condition `@@` (optionnelle) et
  l'expression `ts_rank` à partir du texte libre normalisé de la requête.
- Tests : `ts_rank` ordonne correctement deux annonces, insensibilité accents.

### Lot 4 — Sémantique (embeddings + cosinus brute-force)

- Schéma `listings` : colonne `embedding real[]` (nullable) + `embedding_model`
  (text) pour tracer le modèle/version.
- `lib/llm/embeddings.ts` : `embed(text): Promise<number[] | null>` via OpenAI
  `text-embedding-3-small` (fetch direct, timeout, fallback `null` si pas de clé
  ou erreur). Texte source = `title + description + amenities labels`.
- Intégration écriture : POST `/api/listings` et enrich scrapers génèrent
  l'embedding (best-effort, n'échoue jamais la création).
- Script `scripts/backfill-embeddings.ts` (tsx) : remplit les annonces sans
  embedding, idempotent, throttlé.
- Cosinus brute-force en SQL : expression de similarité entre `embedding` et le
  vecteur de requête (passé en paramètre), exposée comme signal. Helper isolé
  pour pouvoir remplacer par `<=>` pgvector plus tard.
- Tests : `embed` mocké ; calcul cosinus déterministe vérifié ; comportement sans
  clé (signal neutre).

### Lot 5 — Score de pertinence hybride

- `lib/search-ranking.ts` : assemble le score
  `0.35·sémantique + 0.25·lexical + 0.20·proximité + 0.10·confiance + 0.10·fraîcheur`,
  chaque composante normalisée [0,1]. Constantes de pondération exportées.
  - proximité = `1 - clamp(distance / rayon)` (ou `1 - clamp(distance / D_MAX)`
    sans rayon explicite mais avec un centre).
  - fraîcheur = décroissance sur l'âge (`createdAt`).
- `/api/listings` : `sort=relevance` utilise ce score. Quand la requête est
  **purement textuelle** (texte libre sans filtre structurel fort), appliquer un
  **plancher** lexical/sémantique pour ne pas renvoyer tout le catalogue.
- Le texte libre résiduel : la couche conversationnelle conserve la requête
  brute et la passe à `/api/listings` (nouveau param `q`) en plus des filtres.
  `search-filters.ts` (parse/serialize) gère `q`.
- Tests : `search-ranking.test.ts` (formule, normalisation, bornes) ; un cas
  d'intégration ordonnant un petit jeu de lignes.

### Lot 6 — Cache NLP

- `lib/llm/cache.ts` : cache Redis `hash(query + history) → {filters, summary,
  clarification}` avec TTL. Court-circuite `conversationalSearch` sur hit.
  No-op propre si `REDIS_URL` absent.
- Tests : hit/miss, clé stable, dégradation sans Redis.

## Flux de données (après)

```
requête FR ─▶ conversationalSearch (cache Redis ↔ OpenAI/fallback)
           ─▶ filtres structurés + texte libre conservé (q)
           ─▶ resolveSearchPlace (géocodage biaisé, fuzzy fokontany)
           ─▶ /api/listings :
                WHERE (filtres durs: txn, type, prix, surface, rooms, rayon)
                SELECT distanceM, ts_rank, cosinus(embedding, embed(q))
                ORDER BY score hybride (sort=relevance) ou tri explicite
```

## Gestion des erreurs / dégradation

- OpenAI indispo (extraction) → fallback regex (déjà en place).
- OpenAI indispo (embeddings) → sémantique neutre, ranking sur les 4 autres
  signaux.
- Nominatim indispo / rejet → repli centroïde fokontany (déjà en place).
- Redis absent → cache no-op.
- Aucune de ces pannes ne doit faire échouer une recherche ou une création.

## Tests & vérification

- Unitaires vitest pour chaque helper pur (ranking, text-search, embeddings
  mockés, fuzzy, cache).
- Migrations générées via `drizzle-kit generate` et appliquées (`db:migrate`)
  contre la vraie base ; requêtes clés exécutées et observées sur les 129 lignes.
- Backfill embeddings exécuté et vérifié (couverture des annonces).
- `npm run lint` propre.

## Hors périmètre (YAGNI)

- Installation/migration vers pgvector (interface prête, mais non faite).
- Isochrones / temps de trajet (rayon à vol d'oiseau conservé).
- Moteur de recherche externe.
- Re-ranking par feedback utilisateur / apprentissage.
```
