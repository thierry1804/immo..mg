# immo·mg

Conseiller immobilier IA pour Antananarivo — agrège, dédoublonne et enrichit les
annonces (score de confiance, coût réel, compatibilité). Carte MapLibre + PostGIS,
scraping CoinAfrique et sources configurables, recherche conversationnelle.

## Sommaire

- [Capacités livrées](#capacités-livrées)
- [Démarrage rapide](#démarrage-rapide)
- [Architecture](#architecture)
- [Modèle de données](#modèle-de-données)
- [Authentification et rôles](#authentification-et-rôles)
- [Création d'annonce](#création-dannonce)
- [Système de scraping](#système-de-scraping)
- [Administration](#administration)
- [Variables d'environnement](#variables-denvironnement)
- [Commandes utiles](#commandes-utiles)
- [Limites connues](#limites-connues)

---

## Capacités livrées

**Côté utilisateur**
- Inscription / connexion (sessions DB, cookie `httpOnly`).
- Carte d'accueil MapLibre centrée sur Antananarivo ; pan/zoom met à jour la
  liste latérale (requête `bbox` côté serveur via PostGIS).
- Filtres : transaction (vente/location), type de bien, fourchette de prix,
  surface minimale, nombre de pièces minimal.
- Création d'annonce protégée : titre, description, prix (Ariary),
  positionnement par clic sur la carte, **adresse pré-remplie par
  reverse-geocoding Nominatim**, upload de photos.
- Page détail d'annonce avec galerie, devise Ariary formatée
  (`1 500 000 Ar`, `/ mois` pour les locations).

**Côté admin**
- Page **Modération** des annonces scrapées (`pending_review` → `active` ou
  `rejected`).
- Page **Sources** pour configurer dynamiquement les sites à scraper
  (sélecteurs CSS, cadence, etc.) et **lancer un scrape à la demande**.
- Premier admin promu via la variable `BOOTSTRAP_ADMIN_EMAIL` à l'inscription.

**Côté infra**
- Postgres 16 + PostGIS et Redis 7 lancés via `docker-compose`.
- Worker BullMQ séparé du serveur Next.js, jobs récurrents toutes les
  `SCRAPE_INTERVAL_HOURS` heures + déclenchement manuel.
- Géocodage et reverse-géocodage Nominatim throttlés à 1 req/s, cache DB
  pour le géocodage.

---

## Démarrage rapide

```bash
# 1. Dépendances
npm install

# 2. Services (Postgres + PostGIS + Redis)
docker compose up -d

# 3. Variables d'environnement
cp .env.example .env.local
# éditez .env.local : au minimum BOOTSTRAP_ADMIN_EMAIL si vous voulez un admin

# 4. Migrations Drizzle
npm run db:migrate

# 5. Serveur Next.js
npm run dev   # http://localhost:3000

# 6. Worker de scraping (dans un autre terminal)
npm run worker
```

Pour devenir admin : inscrivez-vous avec l'email exact configuré dans
`BOOTSTRAP_ADMIN_EMAIL`. Cet utilisateur reçoit `role='admin'` à
l'inscription et voit apparaître les liens **Sources** et **Modération**
dans le header.

---

## Architecture

```
Next.js 16 (App Router, TS, Tailwind 4)
├─ Pages serveur (auth, listings, admin)
├─ API Routes (/api/auth, /api/listings, /api/upload,
│              /api/geocode/reverse, /api/admin/*)
├─ Composants client (Map, ListingForm, HomeView, FiltersPanel, …)
└─ MapLibre GL JS + tuiles OSM

PostgreSQL 16 + PostGIS
└─ Schéma piloté par Drizzle ORM (src/db/schema.ts, migrations versionnées)

Redis 7
└─ Backend BullMQ pour la file "scrape"

Worker Node (scripts/worker.ts)
├─ BullMQ Worker (concurrency=1)
├─ Jobs récurrents enregistrés au boot pour chaque source active
└─ Pipeline : fetch (cheerio) → normalize → geocode (Nominatim) →
              upsert (INSERT ou UPDATE selon source + external_id)

Pas de NestJS : Next.js full-stack tient tout l'API. Le worker est volontairement
hors Next pour ne pas bloquer les requêtes pendant les scrapes.
```

Arborescence simplifiée :

```
src/
├─ app/
│  ├─ (auth)/{login,signup}        # pages publiques
│  ├─ admin/
│  │  ├─ moderation/               # approve/reject UI
│  │  └─ sources/                  # CRUD + run UI
│  ├─ api/
│  │  ├─ auth/{signup,login,logout}
│  │  ├─ listings, listings/[id]
│  │  ├─ upload                    # multipart, FS local
│  │  ├─ geocode/reverse           # Nominatim wrapper
│  │  └─ admin/
│  │     ├─ listings/[id]/{approve,reject}
│  │     ├─ sources, sources/[id], sources/[id]/run
│  │     └─ scrapers/[slug]/run    # déclenche un built-in
│  ├─ listings/[id]                # page détail
│  ├─ listings/new                 # création (protégée)
│  └─ page.tsx                     # carte d'accueil
├─ components/
│  ├─ Map.tsx                      # MapLibre (picker + viewer)
│  ├─ HomeView.tsx                 # carte + liste + filtres
│  ├─ ListingForm.tsx              # création avec reverse-geocode
│  ├─ FiltersPanel.tsx, ListingCard.tsx, PhotoUploader.tsx,
│  └─ LogoutButton.tsx
├─ db/
│  ├─ schema.ts                    # tables + custom type geography
│  ├─ client.ts                    # pool postgres + drizzle()
│  └─ migrations/                  # 0000…0003
├─ lib/
│  ├─ auth.ts                      # sessions, requireAdmin
│  ├─ format.ts                    # formatPrice (Ariary)
│  ├─ geo.ts                       # parseBbox
│  ├─ queue.ts, redis.ts           # BullMQ + ioredis
│  ├─ reverse-geocode.ts           # Nominatim throttlé
│  ├─ upload.ts                    # FS save
│  └─ validation.ts                # schémas Zod
├─ scrapers/
│  ├─ types.ts                     # Scraper, RawListing, NormalizedListing
│  ├─ normalize.ts                 # parsing prix/type/transaction
│  ├─ geocode.ts                   # forward-geocode Nominatim + cache
│  ├─ upsert.ts                    # INSERT/UPDATE par (source, externalId)
│  ├─ http.ts                      # fetchHtml(url) avec UA identifié
│  ├─ dynamic.ts                   # scraper générique (lit scrape_sources)
│  ├─ registry.ts                  # union static + dynamic
│  └─ sources/
│     ├─ coinafrique.ts            # hardcodé, marche prêt à l'emploi
│     └─ facebook.ts               # désactivé par défaut, ToS-risqué
└─ proxy.ts                        # Next 16: protège /listings/new

scripts/
├─ worker.ts                       # tsx --env-file=.env.local
└─ enqueue-once.ts                 # CLI : npm run scrape:once -- <slug>
```

---

## Modèle de données

Tables Drizzle (`src/db/schema.ts`) :

| Table | Rôle |
|---|---|
| `users` | id (uuid text), email unique, hashed_password (argon2), `role` ('user' \| 'admin'), created_at |
| `sessions` | session id (sha256 du token), user_id, expires_at |
| `listings` | id, **user_id nullable** (null pour scrapées), title, description, transaction_type, property_type, price **bigint**, address, **location `geography(Point,4326)`** (index GIST), status ('active' \| 'archived' \| 'pending_review' \| 'rejected'), `source` (text libre), `external_url`, `external_id`, `scraped_at`, `raw_hash`, created_at. Index unique partiel `(source, external_id) WHERE external_id IS NOT NULL`. |
| `property_details` | listing_id (PK FK), surface_m2, rooms, bedrooms?, bathrooms? |
| `listing_photos` | id, listing_id, **path** (URL distante OU `/uploads/uuid.png`), display_order |
| `geocode_cache` | address_hash (PK = sha256), lng, lat, found_at |
| `scrape_sources` | id, slug unique, name, enabled, base_url, list_urls (jsonb[]), **selectors** (jsonb { card, link, title, price, address, image? }), default_transaction_type?, max_pages, throttle_ms, last_run_at, created_at, updated_at |

Le prix est en `bigint` parce qu'une villa à 2,5 Md Ar dépasse `INT4_MAX`
(~2,15 Md). La colonne `source` est `text` plutôt qu'`enum` pour qu'un admin
puisse ajouter de nouveaux slugs dynamiquement via la page Sources.

---

## Authentification et rôles

Implémentation maison inspirée de Lucia v3 (qui est en sunset), avec les
primitives `@oslojs/crypto` et `@oslojs/encoding` :

1. À l'inscription/connexion : on génère un token aléatoire 20 octets,
   base32-encodé, posé dans le cookie `geomarket_session` (httpOnly,
   sameSite=lax, 30 jours).
2. En base, on stocke `sha256(token)` comme `sessions.id`. Le token brut
   n'est jamais persisté.
3. À chaque requête authentifiée, on hash le cookie pour retrouver la
   session puis l'utilisateur. Renouvellement glissant : si la session
   expire dans <15 j, son `expires_at` est repoussé de 30 j.
4. Mots de passe en argon2 (`@node-rs/argon2`, paramètres OWASP-friendly).

Helpers dans `src/lib/auth.ts` :
- `getCurrentSession()` — server-side cache React, renvoie `{ session, user } | { null, null }`.
- `requireAdmin()` — lève `AuthError` (401/403) sinon retourne le user.

Le `proxy.ts` (équivalent middleware Next 16) protège `/listings/new` en
checkant juste la présence du cookie. Les pages serveur revérifient via
`getCurrentSession()`/`redirect()`.

**Bootstrap admin** : si `BOOTSTRAP_ADMIN_EMAIL` est défini et que cet email
exact s'inscrit, son `role` est posé à `'admin'` directement.

**Mots de passe dev** : les comptes affichés sur `/login` sont définis dans
`src/lib/dev-access.ts`. Pour les aligner avec la base : `npm run db:sync-dev-passwords`.

---

## Création d'annonce

`/listings/new` (form protégé) :

1. L'utilisateur remplit titre, description, type, prix Ariary, surface,
   pièces.
2. Il clique sur la carte → un marker rouge se pose → l'app appelle
   `GET /api/geocode/reverse?lng=&lat=` → `Nominatim /reverse` → le champ
   adresse est **pré-rempli** avec `display_name` (ex. `Boulevard de l'OUA,
   Cité des Douanes, Toamasina, …, Madagascar`). L'utilisateur peut
   éditer ensuite.
3. Les photos passent par `POST /api/upload` (multipart, MIME-checked,
   limite 5 Mo, sauvegarde dans `public/uploads/uuid.ext`).
4. À la soumission, `POST /api/listings` valide via Zod
   (`listingInputSchema`), insère listing + property_details + photos en
   une transaction, puis redirige vers la page détail.

Les erreurs de validation s'affichent par champ dans le formulaire (libellé
français + message Zod).

---

## Système de scraping

### Pipeline

```
[Scraper.fetchListings()]  →  RawListing  →  normalize()  →  geocode()
                                                              │
                                                              ▼
                                                         upsert(listings)
                                                            status='pending_review'
```

- `normalize()` (`src/scrapers/normalize.ts`) parse le prix (chiffres + virgule),
  surface (`m²`), pièces, et infère `transaction_type` / `property_type`
  via mots-clés français.
- `geocode()` (`src/scrapers/geocode.ts`) interroge Nominatim (1 req/s,
  `countrycodes=mg`, UA identifié) et cache le résultat dans
  `geocode_cache` (clé = sha256 de l'adresse).
- `upsert()` (`src/scrapers/upsert.ts`) fait SELECT puis INSERT ou UPDATE
  selon le couple `(source, external_id)`. Met aussi à jour les photos.

### Deux familles de scrapers

**Hardcodés** (`src/scrapers/sources/*.ts`) :
- `coinafrique` : implémentation complète pour mg.coinafrique.com.
  Configurable via `COINAFRIQUE_MAX_PAGES` et `COINAFRIQUE_FETCH_DETAILS`.
- `ofim` : flux RSS `https://www.ofim.mg/rss.php` (50 dernières annonces).
  `OFIM_SCRAPER_ENABLED` (défaut activé).
- `acropole` : acropole-immo.net (pagination `op_page`, prix EUR convertis en
  Ariary via `ACROPOLE_EUR_TO_AR_RATE`, défaut 4800). `ACROPOLE_MAX_PAGES`,
  `ACROPOLE_FETCH_DETAILS`.
- `etrano` : e-trano.com (UA navigateur requis). `ETRANO_MAX_PAGES`,
  `ETRANO_FETCH_DETAILS`. Les annonces « prix sur demande » sont ignorées.
- `facebook` : stub désactivé par défaut. Activation : `FB_SCRAPER_ENABLED=true`,
  `FB_USERNAME`, `FB_PASSWORD`, plus `npm i playwright && npx playwright
  install chromium`. **Viole les ToS Meta, à n'utiliser que pour
  R&D personnelle**.

**Dynamiques** (`src/scrapers/dynamic.ts`) :
- Chaque ligne de `scrape_sources` produit un scraper construit à la
  volée par `buildDynamicScraper(row)`.
- Cheerio applique les sélecteurs CSS (`card`, `link`, `title`, `price`,
  `address`, `image?`) à chaque page d'index.
- L'external_id est un hash SHA-1 (24 chars) de l'URL détail, ce qui rend
  les sources dynamiques idempotentes par défaut.

### Worker

`scripts/worker.ts` :
1. Au boot, charge l'union scrapers hardcodés activés + sources dynamiques.
2. Enregistre un job BullMQ récurrent par slug (`every: SCRAPE_INTERVAL_HOURS h`).
3. Processeur : `findScraper(slug)` (re-lit la config DB pour les
   dynamiques), itère `fetchListings()`, applique le pipeline, met à jour
   `scrape_sources.last_run_at`.
4. Erreurs par item sont attrapées et comptabilisées dans les stats ; une
   ligne foireuse ne casse pas le tour.

Déclenchement manuel :
- Depuis l'UI : `/admin/sources` → bouton **Lancer** (POST
  `/api/admin/sources/[id]/run` ou `/api/admin/scrapers/[slug]/run`).
- Depuis le CLI : `npm run scrape:once -- coinafrique` (ou n'importe quel
  slug, dynamique ou non).

---

## Administration

### `/admin/moderation`

Liste les listings en `pending_review`. Pour chaque carte : miniature,
titre, source, lien externe, prix Ariary, mini-position. Deux actions :

- **Approuver** → `POST /api/admin/listings/[id]/approve` → `status='active'`,
  apparaît immédiatement sur la carte d'accueil.
- **Rejeter** → `POST /api/admin/listings/[id]/reject` → `status='rejected'`,
  reste invisible.

Les deux endpoints sont gated par `requireAdmin()`.

### `/admin/sources`

Liste les **sources intégrées** (coinafrique, facebook) en lecture seule et
les **sources personnalisées** (DB) avec leur slug, statut, dernière
exécution. Boutons : Lancer / Éditer / Supprimer.

`/admin/sources/new` et `/admin/sources/[id]` ouvrent un formulaire :

| Champ | Description |
|---|---|
| Slug | id technique unique (lowercase + dash) ; les slugs réservés (`user`, `coinafrique`, `facebook`) sont rejetés en 409 |
| Nom | libellé affiché |
| Activé | si non, le worker ignore cette source et le bouton « Lancer » est désactivé |
| baseUrl | racine du site, pour résoudre les liens relatifs |
| listUrls | une URL d'index par ligne |
| Sélecteurs CSS | `card, link, title, price, address, image?` (obligatoires sauf image) |
| Type de transaction par défaut | `auto`, `sale` ou `rent`. `auto` infère via mots-clés |
| Max pages | nombre de pages paginées à crawler par URL d'index (`?page=N`) |
| Throttle (ms) | délai minimum entre requêtes vers ce site |

Une fois sauvegardée, un clic sur **Lancer** enqueue immédiatement un job
BullMQ. Le worker traite, géocode, upsert ; les annonces atterrissent en
`pending_review` et apparaissent dans la page Modération.

---

## Variables d'environnement

`.env.example` recense le tout. À adapter dans `.env.local` :

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | URL postgres (par défaut `postgres://geomarket:geomarket@localhost:5432/geomarket`) |
| `AUTH_SECRET` | rotation obligatoire en prod |
| `REDIS_URL` | par défaut `redis://localhost:6379` |
| `SCRAPER_USER_AGENT` | identifie nos scrapers ; respectez les ToS / contact utile |
| `NOMINATIM_URL` | par défaut le serveur public ; en prod, montez une instance dédiée |
| `SCRAPE_INTERVAL_HOURS` | intervalle entre runs récurrents (défaut 6) |
| `BOOTSTRAP_ADMIN_EMAIL` | l'email exact qui devient admin à l'inscription |
| `COINAFRIQUE_MAX_PAGES`, `COINAFRIQUE_FETCH_DETAILS` | tuning du scraper hardcodé |
| `OFIM_SCRAPER_ENABLED` | scraper OFIM RSS (on par défaut) |
| `ACROPOLE_*`, `ETRANO_*` | tuning scrapers agences (pages, détails, taux EUR→Ar) |
| `FB_SCRAPER_ENABLED`, `FB_USERNAME`, `FB_PASSWORD` | scraper Facebook (off par défaut) |

---

## Commandes utiles

```bash
# Développement
npm run dev                  # Next.js dev sur :3000
npm run worker               # worker BullMQ
npm run scrape:once -- <slug># enqueue un scrape immédiat
npm run lint
npm run typecheck
npm run alert:digest         # notifications + emails de matching profil

# Migrations
npm run db:generate          # crée un fichier .sql depuis schema.ts
npm run db:migrate           # applique les migrations en attente
npm run db:studio            # explorateur web Drizzle Studio

# Inspections rapides
docker exec geomarket-db psql -U geomarket -d geomarket -c \
  "SELECT source, status, count(*) FROM listings GROUP BY source, status;"
docker exec geomarket-redis redis-cli ping
```

---

## Limites connues

- **Dédoublonnage cross-source (heuristique)** : lors d’un scrape, les biens
  proches (150 m) avec prix/surface/transaction similaires sont fusionnés dans
  `sources` JSON ; les doublons sont marqués `is_duplicate`. Pas de fusion
  rétroactive parfait sur l’historique.
- **Pas de tests automatisés sur les scrapers HTML** : les sélecteurs
  cassent quand un site change son markup. Surveiller les stats du worker
  (`inserted/dropped/errors`).
- **Facebook** : module fourni mais ToS-risqué, désactivé par défaut.
- **Tuiles OSM** : politique d'utilisation OSM décourage l'usage en
  production direct ; le `maxzoom` est limité à 19 pour éviter les
  requêtes 404. Pour scaler : passer à MapTiler / Stadia / Protomaps.
- **Nominatim public** : 1 req/s. Pour des volumes plus élevés, déployer
  une instance privée et pointer `NOMINATIM_URL` dessus.
- **Pas de TTL sur `geocode_cache`** : acceptable, les adresses changent
  peu.
- **`scrape_sources.listUrls` paginée trivialement** (`?page=N`) ; pour des
  sites paginant autrement (offset, slug `/page/N/`), adapter
  `src/scrapers/dynamic.ts`.
