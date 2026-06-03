# Recherche NLP & Géospatiale Hybride — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Passer d'une recherche « filtres binaires » à une recherche qui classe les annonces par pertinence en combinant distance géo, full-text français, similarité sémantique, confiance et fraîcheur.

**Architecture:** Les filtres structurés restent des `WHERE` durs en SQL (prix, type, txn, surface, rayon PostGIS). Les signaux de pertinence (distance via `ST_Distance`, lexical via `ts_rank`, sémantique via une fonction SQL `cosine_similarity` sur un embedding stocké en colonne `real[]`) sont calculés comme **scalaires par ligne** dans le `SELECT`, puis combinés en un score pondéré dans une fonction TS pure et testable (`search-ranking.ts`). Volume = 129 annonces, donc tri applicatif du jeu candidat (≤200) est instantané. Aucune dépendance pgvector. Embeddings générés à l'écriture + backfill, dégradation propre sans `OPENAI_API_KEY`. Cache Redis des extractions NLP.

**Tech Stack:** Next.js 16, Drizzle ORM, PostgreSQL 16 + PostGIS 3.4 + `pg_trgm`/`unaccent`, OpenAI (`text-embedding-3-small`), ioredis, vitest, tsx.

**Référence design:** `docs/superpowers/specs/2026-06-03-search-nlp-geospatial-design.md`

---

## File Structure

**Créés :**
- `src/lib/levenshtein.ts` — distance d'édition pure (fuzzy fokontany).
- `src/lib/listing-text-search.ts` — construit la `tsquery` FR et l'expression `ts_rank`.
- `src/lib/llm/embeddings.ts` — `embed(text)` via OpenAI, fallback `null`.
- `src/lib/llm/nlp-cache.ts` — cache Redis `(query+history) → résultat conversationnel`.
- `src/lib/search-ranking.ts` — pondérations + `computeRelevanceScore(signals)` (TS pur).
- `scripts/backfill-embeddings.ts` — remplit les embeddings manquants.
- Tests : `*.test.ts` à côté de chaque module pur.

**Modifiés :**
- `src/db/schema.ts` — colonnes `embedding real[]`, `embeddingModel text` ; déclaration de `search_vector`.
- `src/db/migrations/<generated>.sql` — extension `unaccent`, config `fr_unaccent`, colonne générée `search_vector` + index GIN, fonction `cosine_similarity`, index `pg_trgm` (optionnel).
- `src/lib/listing-geo-filter.ts` — expression `ST_Distance` réutilisable.
- `src/lib/search-anchor.ts` — `applyMaisonVillaHint` (retirer l'exclusion titre).
- `src/lib/fokontany.ts` — `matchFokontanyByName` fuzzy.
- `src/scrapers/geocode.ts` — biais `viewbox`/`bounded` + filtre `importance`.
- `src/lib/search-filters.ts` + `src/lib/validation.ts` — param `q` (texte libre).
- `src/app/api/listings/route.ts` — signaux SQL + tri par score hybride.
- `src/app/api/listings/route.ts` (POST) & `src/scrapers/upsert.ts` — embedding à l'écriture.
- `src/lib/llm/openai.ts` — branchement du cache NLP.

---

## Task 1 : Fix du hint maison/villa

**Files:**
- Modify: `src/lib/search-anchor.ts:33-47`
- Test: `src/lib/search-anchor.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

Ajouter dans `src/lib/search-anchor.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { enrichSearchFilters } from "@/lib/search-anchor";

describe("applyMaisonVillaHint", () => {
  it("force le type maison sans exclure les titres 'villa'", () => {
    const out = enrichSearchFilters("maison a vendre", {});
    expect(out.propertyType).toBe("house");
    expect(out.excludeTitleContains).toBeUndefined();
  });

  it("ne touche pas au type si 'villa' est cité", () => {
    const out = enrichSearchFilters("villa a vendre", {});
    expect(out.excludeTitleContains).toBeUndefined();
  });
});
```

- [ ] **Step 2: Lancer le test pour vérifier l'échec**

Run: `npx vitest run src/lib/search-anchor.test.ts`
Expected: FAIL — `excludeTitleContains` vaut `"villa"`.

- [ ] **Step 3: Implémenter le correctif**

Dans `src/lib/search-anchor.ts`, remplacer le corps de `applyMaisonVillaHint` :

```ts
/** « Maison » sans « villa » → on suppose le type maison, sans exclure de titres. */
function applyMaisonVillaHint(
  query: string,
  filters: SearchFilters,
): SearchFilters {
  const s = foldQuery(query);
  if (/\bmaison\b/.test(s) && !/\bvilla\b/.test(s)) {
    return { ...filters, propertyType: filters.propertyType ?? "house" };
  }
  return filters;
}
```

- [ ] **Step 4: Lancer le test**

Run: `npx vitest run src/lib/search-anchor.test.ts`
Expected: PASS. Vérifier qu'aucun test existant ne référence `excludeTitleContains: "villa"` ; si oui, le mettre à jour.

- [ ] **Step 5: Commit**

```bash
git add src/lib/search-anchor.ts src/lib/search-anchor.test.ts
git commit -m "fix(search): ne plus exclure les titres 'villa' sur une requête maison"
```

---

## Task 2 : Distance géo réutilisable + tri par distance

**Files:**
- Modify: `src/lib/listing-geo-filter.ts`
- Test: `src/lib/listing-geo-filter.test.ts`
- Modify: `src/app/api/listings/route.ts`

- [ ] **Step 1: Écrire le test qui échoue (résolution du centre)**

`listingDistanceCenter` est une fonction pure qui renvoie le centre (lng/lat) effectif d'une recherche géo, ou `null`. Ajouter dans `src/lib/listing-geo-filter.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { listingDistanceCenter } from "@/lib/listing-geo-filter";

describe("listingDistanceCenter", () => {
  it("renvoie les coordonnées géocodées quand présentes", () => {
    expect(
      listingDistanceCenter({ nearLng: 47.52, nearLat: -18.91, radiusKm: 5 }),
    ).toEqual({ lng: 47.52, lat: -18.91 });
  });

  it("retombe sur le centroïde fokontany", () => {
    expect(listingDistanceCenter({ fokontany: "Ivato", radiusKm: 5 })).toEqual({
      lng: 47.472,
      lat: -18.832,
    });
  });

  it("renvoie null sans centre", () => {
    expect(listingDistanceCenter({})).toBeNull();
  });
});
```

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run: `npx vitest run src/lib/listing-geo-filter.test.ts`
Expected: FAIL — `listingDistanceCenter` n'existe pas.

- [ ] **Step 3: Implémenter `listingDistanceCenter` + `listingDistanceExpr`**

Dans `src/lib/listing-geo-filter.ts`, ajouter :

```ts
/** Centre effectif d'une recherche géo (coordonnées géocodées ou centroïde fokontany). */
export function listingDistanceCenter(
  filters: Pick<SearchFilters, "fokontany" | "nearLng" | "nearLat">,
): { lng: number; lat: number } | null {
  if (filters.nearLng != null && filters.nearLat != null) {
    return { lng: filters.nearLng, lat: filters.nearLat };
  }
  if (filters.fokontany) {
    const c = fokontanyCentroid(filters.fokontany);
    if (c) return c;
  }
  return null;
}

/** Expression SQL : distance en mètres entre chaque annonce et le centre, ou undefined. */
export function listingDistanceExpr(
  filters: Pick<SearchFilters, "fokontany" | "nearLng" | "nearLat">,
): SQL | undefined {
  const center = listingDistanceCenter(filters);
  if (!center) return undefined;
  return sql`ST_Distance(
    ${listings.location},
    ST_SetSRID(ST_MakePoint(${center.lng}, ${center.lat}), 4326)::geography
  )`;
}
```

- [ ] **Step 4: Lancer le test**

Run: `npx vitest run src/lib/listing-geo-filter.test.ts`
Expected: PASS.

- [ ] **Step 5: Brancher la distance dans `/api/listings`**

Dans `src/app/api/listings/route.ts`, après le calcul de `locFilter` (vers la ligne 56), ajouter l'expression distance et l'inclure au `SELECT` :

```ts
import { listingDistanceExpr } from "@/lib/listing-geo-filter";
// ...
const distanceExpr = listingDistanceExpr(q);
```

Dans l'objet `.select({ ... })` (vers la ligne 99), ajouter un champ :

```ts
      distanceM: distanceExpr
        ? sql<number>`${distanceExpr}`
        : sql<number | null>`null`,
```

Dans la réponse mappée vers le client, exposer `distanceM` (suivre le mapping existant des `rows`).

- [ ] **Step 6: Tri par distance quand pertinence + rayon (provisoire, raffiné en Task 9)**

Remplacer la clé `relevance` de `orderBy` (ligne ~95) par un tri distance si un centre existe :

```ts
const orderBy =
  (q.sort ?? "relevance") === "relevance" && distanceExpr
    ? sql`${distanceExpr} asc`
    : {
        price_asc: sql`${listings.price} asc`,
        price_desc: sql`${listings.price} desc`,
        surface: sql`${propertyDetails.surfaceM2} desc nulls last`,
        confidence: sql`${listings.confidenceScore} desc nulls last`,
        compat: sql`${listings.confidenceScore} desc nulls last`,
        relevance: sql`${listings.createdAt} desc`,
      }[q.sort ?? "relevance"];
```

- [ ] **Step 7: Vérifier contre la vraie DB**

Run:
```bash
npx tsx -e "fetch('http://localhost:3000/api/listings?fokontany=Ivato&radiusKm=10&sort=relevance').then(r=>r.json()).then(d=>console.log(d.listings?.slice(0,3).map(l=>l.distanceM)))"
```
(Lancer `npm run dev` au préalable.)
Expected: distances croissantes, non nulles.

- [ ] **Step 8: Commit**

```bash
git add src/lib/listing-geo-filter.ts src/lib/listing-geo-filter.test.ts src/app/api/listings/route.ts
git commit -m "feat(search): exposer et trier par distance géodésique"
```

---

## Task 3 : Levenshtein pur

**Files:**
- Create: `src/lib/levenshtein.ts`
- Test: `src/lib/levenshtein.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

```ts
import { describe, expect, it } from "vitest";
import { levenshtein } from "@/lib/levenshtein";

describe("levenshtein", () => {
  it("vaut 0 pour deux chaînes identiques", () => {
    expect(levenshtein("analakely", "analakely")).toBe(0);
  });
  it("compte les substitutions", () => {
    expect(levenshtein("analakely", "analakerly")).toBe(1);
  });
  it("gère les chaînes vides", () => {
    expect(levenshtein("", "abc")).toBe(3);
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/lib/levenshtein.test.ts`
Expected: FAIL — module absent.

- [ ] **Step 3: Implémenter**

`src/lib/levenshtein.ts` :

```ts
/** Distance d'édition (insertions/suppressions/substitutions). Pure, O(n·m). */
export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array<number>(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}
```

- [ ] **Step 4: Vérifier le passage**

Run: `npx vitest run src/lib/levenshtein.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/levenshtein.ts src/lib/levenshtein.test.ts
git commit -m "feat(lib): distance de Levenshtein"
```

---

## Task 4 : Fuzzy fokontany

**Files:**
- Modify: `src/lib/fokontany.ts` (fonction `matchFokontanyByName`)
- Test: `src/lib/fokontany.test.ts` (créer si absent)

- [ ] **Step 1: Écrire le test qui échoue**

Créer/compléter `src/lib/fokontany.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { matchFokontanyByName } from "@/lib/fokontany";

describe("matchFokontanyByName (fuzzy)", () => {
  it("matche un nom exact", () => {
    expect(matchFokontanyByName("je cherche à Analakely")).toBe("Analakely");
  });
  it("tolère une faute de frappe", () => {
    expect(matchFokontanyByName("appartement à Analakelyy")).toBe("Analakely");
  });
  it("ne matche pas un mot trop éloigné", () => {
    expect(matchFokontanyByName("appartement à Paris")).toBeNull();
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/lib/fokontany.test.ts`
Expected: FAIL sur le cas faute de frappe (le matching exact actuel renvoie `null`).

- [ ] **Step 3: Implémenter le fuzzy**

Dans `src/lib/fokontany.ts`, importer `levenshtein` et ajouter un repli fuzzy à la fin de `matchFokontanyByName` (conserver d'abord la logique exacte existante). Le repli : pour chaque token de la requête (foldé, longueur ≥ 4), comparer à chaque nom de fokontany foldé ; accepter si `distance ≤ floor(longueurNom / 5)` borné à [1,2], en prenant le meilleur score.

```ts
import { levenshtein } from "@/lib/levenshtein";
// fold() : minuscule + suppression diacritiques (réutiliser l'helper du module).

// ... après l'échec du matching exact, avant `return null` :
const tokens = fold(query).split(/[^a-z0-9]+/).filter((t) => t.length >= 4);
let best: { name: string; dist: number } | null = null;
for (const f of FOKONTANY) {
  const target = fold(f.name);
  const maxDist = Math.min(2, Math.max(1, Math.floor(target.length / 5)));
  for (const tok of tokens) {
    if (Math.abs(tok.length - target.length) > maxDist) continue;
    const d = levenshtein(tok, target);
    if (d <= maxDist && (!best || d < best.dist)) best = { name: f.name, dist: d };
  }
}
return best?.name ?? null;
```

Si `fold` n'est pas déjà exporté/présent dans `fokontany.ts`, ajouter l'helper local identique à celui de `extract-filters.ts:48`.

- [ ] **Step 4: Vérifier le passage**

Run: `npx vitest run src/lib/fokontany.test.ts`
Expected: PASS. Lancer aussi `npx vitest run src/lib/resolve-search-place.test.ts` pour non-régression.

- [ ] **Step 5: Commit**

```bash
git add src/lib/fokontany.ts src/lib/fokontany.test.ts
git commit -m "feat(search): matching fokontany tolérant aux fautes"
```

---

## Task 5 : Géocodage biaisé Antananarivo

**Files:**
- Modify: `src/scrapers/geocode.ts`
- Modify: `src/lib/resolve-search-place.ts` (passer l'option de biais)
- Test: `src/scrapers/geocode.test.ts` (créer)

- [ ] **Step 1: Écrire le test qui échoue (construction d'URL)**

Extraire la construction d'URL dans une fonction pure `buildNominatimUrl(query, opts)` pour la tester sans réseau. Test `src/scrapers/geocode.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import { buildNominatimUrl } from "@/scrapers/geocode";

describe("buildNominatimUrl", () => {
  it("applique le viewbox + bounded quand biais demandé", () => {
    const url = buildNominatimUrl("gare soarano", { biasTana: true });
    expect(url.searchParams.get("bounded")).toBe("1");
    expect(url.searchParams.get("viewbox")).toMatch(/47\./);
    expect(url.searchParams.get("countrycodes")).toBe("mg");
  });
  it("sans biais : pas de viewbox", () => {
    const url = buildNominatimUrl("antsirabe", {});
    expect(url.searchParams.get("viewbox")).toBeNull();
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/scrapers/geocode.test.ts`
Expected: FAIL — `buildNominatimUrl` n'est pas exporté.

- [ ] **Step 3: Implémenter biais + filtre importance**

Dans `src/scrapers/geocode.ts` :

```ts
// Bounding box Grand Antananarivo (minLng,minLat,maxLng,maxLat → viewbox lon1,lat1,lon2,lat2).
const TANA_VIEWBOX = "47.40,-19.00,47.60,-18.78";
const MIN_IMPORTANCE = 0.2;

export function buildNominatimUrl(
  query: string,
  opts: { biasTana?: boolean } = {},
): URL {
  const url = new URL(`${NOMINATIM_URL}/search`);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "mg");
  url.searchParams.set("addressdetails", "0");
  if (opts.biasTana) {
    url.searchParams.set("viewbox", TANA_VIEWBOX);
    url.searchParams.set("bounded", "1");
  }
  return url;
}
```

Modifier `callNominatim` pour accepter `opts`, utiliser `buildNominatimUrl`, lire `importance` dans le résultat et **rejeter** si `importance < MIN_IMPORTANCE` (type étendu `NominatimResult = { lon: string; lat: string; importance?: number }`). Propager `opts` depuis `geocode(address, opts?)` et inclure `biasTana` dans la clé de cache (`hash(query + (opts.biasTana ? "|tana" : ""))`).

Dans `src/lib/resolve-search-place.ts`, `geocodePlace` appelle `geocode(buildGeocodeQuery(place), { biasTana: true })`.

- [ ] **Step 4: Vérifier le passage**

Run: `npx vitest run src/scrapers/geocode.test.ts`
Expected: PASS.

- [ ] **Step 5: Vérifier contre Nominatim réel (réseau)**

Run:
```bash
npx tsx -e "import('@/scrapers/geocode').then(async m => console.log(await m.geocode('Gare Soarano, Antananarivo, Madagascar', { biasTana: true })))" 2>/dev/null || \
npx tsx --tsconfig tsconfig.json -e "..."
```
Expected: coordonnées dans la bbox Tana (lng ~47.5, lat ~-18.9). Si `GEOCODE_SKIP_NETWORK=true`, sauter.

- [ ] **Step 6: Commit**

```bash
git add src/scrapers/geocode.ts src/lib/resolve-search-place.ts src/scrapers/geocode.test.ts
git commit -m "feat(geocode): biais viewbox Antananarivo + filtre importance"
```

---

## Task 6 : Migration — unaccent, search_vector, cosine_similarity

**Files:**
- Modify: `src/db/schema.ts`
- Create: migration générée puis éditée (`src/db/migrations/<n>_*.sql`)

- [ ] **Step 1: Déclarer les colonnes Drizzle-managées**

Dans `src/db/schema.ts`, table `listings`, ajouter :

```ts
    embedding: real("embedding").array(),
    embeddingModel: text("embedding_model"),
```

Importer `real` depuis `drizzle-orm/pg-core`. (Ne PAS déclarer `search_vector` ici — colonne générée gérée en SQL brut.)

- [ ] **Step 2: Générer la migration**

Run: `npm run db:generate`
Expected: un nouveau fichier `src/db/migrations/0xxx_*.sql` ajoutant `embedding` et `embedding_model`.

- [ ] **Step 3: Compléter la migration en SQL brut**

Éditer ce fichier généré et y **append** (après les `ALTER TABLE` existants) :

```sql
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS unaccent;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
DROP TEXT SEARCH CONFIGURATION IF EXISTS fr_unaccent;
--> statement-breakpoint
CREATE TEXT SEARCH CONFIGURATION fr_unaccent (COPY = french);
--> statement-breakpoint
ALTER TEXT SEARCH CONFIGURATION fr_unaccent
  ALTER MAPPING FOR hword, hword_part, word
  WITH unaccent, french_stem;
--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "search_vector" tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('fr_unaccent', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('fr_unaccent', coalesce("description", '')), 'B') ||
    setweight(to_tsvector('fr_unaccent', coalesce("address", '')), 'C')
  ) STORED;
--> statement-breakpoint
CREATE INDEX "listings_search_vector_idx" ON "listings" USING gin ("search_vector");
--> statement-breakpoint
CREATE OR REPLACE FUNCTION cosine_similarity(a real[], b real[])
RETURNS double precision LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN a IS NULL OR b IS NULL OR array_length(a,1) IS DISTINCT FROM array_length(b,1)
      THEN NULL
    WHEN (SELECT sqrt(sum(x*x)) FROM unnest(a) x) = 0
      OR (SELECT sqrt(sum(y*y)) FROM unnest(b) y) = 0
      THEN NULL
    ELSE (
      SELECT sum(ea * eb) FROM (
        SELECT a[i] AS ea, b[i] AS eb
        FROM generate_subscripts(a, 1) AS i
      ) t
    ) / (
      (SELECT sqrt(sum(x*x)) FROM unnest(a) x) *
      (SELECT sqrt(sum(y*y)) FROM unnest(b) y)
    )
  END;
$$;
```

- [ ] **Step 4: Appliquer et vérifier**

Run: `npm run db:migrate`
Then:
```bash
npx tsx -e "import('@/db/client').then(async ({db}) => { const {sql}=await import('drizzle-orm'); const r=await db.execute(sql\`select to_tsvector('fr_unaccent','Bel appartement éclairé') as v, cosine_similarity(ARRAY[1,0,0]::real[], ARRAY[1,0,0]::real[]) as c\`); console.log(r.rows ?? r); })"
```
Expected: `v` contient des lexèmes sans accent (`eclaire`), `c` = 1.

- [ ] **Step 5: Commit**

```bash
git add src/db/schema.ts src/db/migrations
git commit -m "feat(db): full-text FR (unaccent), embedding columns, cosine_similarity"
```

---

## Task 7 : Module embeddings

**Files:**
- Create: `src/lib/llm/embeddings.ts`
- Test: `src/lib/llm/embeddings.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildEmbeddingInput } from "@/lib/llm/embeddings";

describe("buildEmbeddingInput", () => {
  it("concatène titre, description et libellés d'équipements", () => {
    const text = buildEmbeddingInput({
      title: "Villa neuve",
      description: "Avec jardin",
      amenities: ["pool"],
    });
    expect(text).toContain("Villa neuve");
    expect(text).toContain("Avec jardin");
    expect(text.toLowerCase()).toContain("piscine"); // AMENITY_LABELS.pool
  });
});
```
(Adapter le libellé attendu à `AMENITY_LABELS` réel.)

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/lib/llm/embeddings.test.ts`
Expected: FAIL — module absent.

- [ ] **Step 3: Implémenter**

`src/lib/llm/embeddings.ts` :

```ts
import { AMENITY_LABELS, type Amenity } from "@/lib/amenities";

const URL = "https://api.openai.com/v1/embeddings";
export const EMBEDDING_MODEL = "text-embedding-3-small";

export function buildEmbeddingInput(l: {
  title: string;
  description: string;
  amenities: Amenity[] | string[];
}): string {
  const labels = (l.amenities as string[])
    .map((a) => AMENITY_LABELS[a as Amenity] ?? a)
    .join(", ");
  return [l.title, l.description, labels].filter(Boolean).join("\n");
}

/** Embedding OpenAI. Renvoie null sans clé ou sur erreur (dégradation propre). */
export async function embed(text: string): Promise<number[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  const input = text.trim();
  if (!apiKey || !input) return null;
  try {
    const res = await fetch(URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      data?: { embedding?: number[] }[];
    };
    return data.data?.[0]?.embedding ?? null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Vérifier le passage**

Run: `npx vitest run src/lib/llm/embeddings.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/llm/embeddings.ts src/lib/llm/embeddings.test.ts
git commit -m "feat(llm): module d'embeddings OpenAI avec fallback"
```

---

## Task 8 : Embedding à l'écriture + backfill

**Files:**
- Modify: `src/app/api/listings/route.ts` (POST)
- Modify: `src/scrapers/upsert.ts`
- Create: `scripts/backfill-embeddings.ts`

- [ ] **Step 1: Helper d'écriture partagé**

Ajouter dans `src/lib/llm/embeddings.ts` (même fichier : `EMBEDDING_MODEL`, `embed`, `buildEmbeddingInput`, `Amenity` sont déjà en portée, aucun import à ajouter) :

```ts
/** Construit les colonnes embedding pour un insert/update (best-effort). */
export async function embeddingColumns(l: {
  title: string;
  description: string;
  amenities: Amenity[] | string[];
}): Promise<{ embedding: number[]; embeddingModel: string } | object> {
  const vec = await embed(buildEmbeddingInput(l));
  return vec ? { embedding: vec, embeddingModel: EMBEDDING_MODEL } : {};
}
```
(Pas de test dédié : couvert par `embed`/`buildEmbeddingInput`.)

- [ ] **Step 2: Brancher dans le POST `/api/listings`**

Dans `src/app/api/listings/route.ts`, avant `db.transaction`, calculer :

```ts
const embCols = await embeddingColumns({
  title: input.title,
  description: input.description,
  amenities: input.amenities,
});
```
Étaler `...embCols` dans `tx.insert(listings).values({ ... })`.

- [ ] **Step 3: Brancher dans `src/scrapers/upsert.ts`**

Aux deux points d'insertion/maj de `listings` (lignes ~94 et ~191), calculer `embeddingColumns({ title: n.title, description: n.description, amenities: n.amenities })` et étaler `...embCols` dans les `.values({...})`. Pour l'update, recalculer seulement si le contenu (title/description/amenities) a changé — sinon laisser l'embedding existant.

- [ ] **Step 4: Script de backfill**

`scripts/backfill-embeddings.ts` :

```ts
import { isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { listings } from "@/db/schema";
import { buildEmbeddingInput, embed, EMBEDDING_MODEL } from "@/lib/llm/embeddings";

async function main() {
  const rows = await db
    .select({
      id: listings.id,
      title: listings.title,
      description: listings.description,
      amenities: listings.amenities,
    })
    .from(listings)
    .where(isNull(listings.embedding));
  console.log(`À traiter : ${rows.length}`);
  let done = 0;
  for (const r of rows) {
    const vec = await embed(buildEmbeddingInput(r));
    if (!vec) {
      console.warn(`skip ${r.id} (pas d'embedding)`);
      continue;
    }
    const { eq } = await import("drizzle-orm");
    await db
      .update(listings)
      .set({ embedding: vec, embeddingModel: EMBEDDING_MODEL })
      .where(eq(listings.id, r.id));
    done++;
    if (done % 20 === 0) console.log(`${done}/${rows.length}`);
  }
  console.log(`Terminé : ${done}/${rows.length}`);
  process.exit(0);
}
main();
```

- [ ] **Step 5: Exécuter le backfill (DB + clé OpenAI)**

Run: `npx tsx scripts/backfill-embeddings.ts`
Expected: « Terminé : N/129 » (N = annonces avec embedding). Vérifier :
```bash
npx tsx -e "import('@/db/client').then(async ({db})=>{const {sql}=await import('drizzle-orm');const r=await db.execute(sql\`select count(*) filter (where embedding is not null) as withemb, count(*) as total from listings\`);console.log(r.rows ?? r);})"
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/listings/route.ts src/scrapers/upsert.ts src/lib/llm/embeddings.ts scripts/backfill-embeddings.ts
git commit -m "feat(search): génération d'embeddings à l'écriture + backfill"
```

---

## Task 9 : Module de scoring de pertinence (TS pur)

**Files:**
- Create: `src/lib/search-ranking.ts`
- Test: `src/lib/search-ranking.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

```ts
import { describe, expect, it } from "vitest";
import { computeRelevanceScore, RELEVANCE_WEIGHTS } from "@/lib/search-ranking";

const now = new Date("2026-06-03T00:00:00Z");

describe("computeRelevanceScore", () => {
  it("somme pondérée normalisée dans [0,1]", () => {
    const s = computeRelevanceScore(
      { lexRank: 1, cosine: 1, distanceM: 0, confidence: 100, createdAt: now },
      { radiusKm: 5, now },
    );
    expect(s).toBeGreaterThan(0.99);
  });

  it("signaux absents = contribution neutre (0), pas NaN", () => {
    const s = computeRelevanceScore(
      { lexRank: null, cosine: null, distanceM: null, confidence: null, createdAt: now },
      { radiusKm: null, now },
    );
    expect(Number.isFinite(s)).toBe(true);
    expect(s).toBeGreaterThanOrEqual(0);
  });

  it("la proximité décroît avec la distance", () => {
    const near = computeRelevanceScore(
      { lexRank: 0, cosine: 0, distanceM: 0, confidence: 0, createdAt: now },
      { radiusKm: 5, now },
    );
    const far = computeRelevanceScore(
      { lexRank: 0, cosine: 0, distanceM: 5000, confidence: 0, createdAt: now },
      { radiusKm: 5, now },
    );
    expect(near).toBeGreaterThan(far);
  });

  it("les poids somment à 1", () => {
    const total = Object.values(RELEVANCE_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 5);
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/lib/search-ranking.test.ts`
Expected: FAIL — module absent.

- [ ] **Step 3: Implémenter**

`src/lib/search-ranking.ts` :

```ts
export const RELEVANCE_WEIGHTS = {
  semantic: 0.35,
  lexical: 0.25,
  proximity: 0.2,
  confidence: 0.1,
  freshness: 0.1,
} as const;

const DEFAULT_RADIUS_KM = 10;
const FRESHNESS_HALFLIFE_DAYS = 30;

export type RelevanceSignals = {
  lexRank: number | null;
  cosine: number | null; // [-1,1]
  distanceM: number | null;
  confidence: number | null; // [0,100]
  createdAt: Date;
};

export type RelevanceContext = { radiusKm: number | null; now: Date };

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export function computeRelevanceScore(
  s: RelevanceSignals,
  ctx: RelevanceContext,
): number {
  // Lexical : ts_rank est non borné ; saturation douce.
  const lexical = s.lexRank == null ? 0 : clamp01(s.lexRank / (s.lexRank + 1));
  // Sémantique : cosinus [-1,1] → [0,1].
  const semantic = s.cosine == null ? 0 : clamp01((s.cosine + 1) / 2);
  // Proximité : 1 au centre, 0 au-delà du rayon (ou rayon par défaut).
  const radiusM = (ctx.radiusKm ?? DEFAULT_RADIUS_KM) * 1000;
  const proximity =
    s.distanceM == null ? 0 : clamp01(1 - s.distanceM / radiusM);
  // Confiance : [0,100] → [0,1].
  const confidence = s.confidence == null ? 0 : clamp01(s.confidence / 100);
  // Fraîcheur : décroissance exponentielle (demi-vie 30j).
  const ageDays =
    (ctx.now.getTime() - s.createdAt.getTime()) / 86_400_000;
  const freshness = clamp01(Math.pow(0.5, Math.max(0, ageDays) / FRESHNESS_HALFLIFE_DAYS));

  return (
    RELEVANCE_WEIGHTS.semantic * semantic +
    RELEVANCE_WEIGHTS.lexical * lexical +
    RELEVANCE_WEIGHTS.proximity * proximity +
    RELEVANCE_WEIGHTS.confidence * confidence +
    RELEVANCE_WEIGHTS.freshness * freshness
  );
}
```

- [ ] **Step 4: Vérifier le passage**

Run: `npx vitest run src/lib/search-ranking.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/search-ranking.ts src/lib/search-ranking.test.ts
git commit -m "feat(search): score de pertinence hybride pondéré (TS pur)"
```

---

## Task 10 : Construction de la tsquery FR

**Files:**
- Create: `src/lib/listing-text-search.ts`
- Test: `src/lib/listing-text-search.test.ts`

- [ ] **Step 1: Écrire le test qui échoue**

`normalizeTextQuery` nettoie le texte libre (longueur min, trim). Test :

```ts
import { describe, expect, it } from "vitest";
import { normalizeTextQuery } from "@/lib/listing-text-search";

describe("normalizeTextQuery", () => {
  it("renvoie null pour du vide ou trop court", () => {
    expect(normalizeTextQuery("  ")).toBeNull();
    expect(normalizeTextQuery("a")).toBeNull();
  });
  it("nettoie et conserve un texte utile", () => {
    expect(normalizeTextQuery("  appartement lumineux  ")).toBe(
      "appartement lumineux",
    );
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/lib/listing-text-search.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implémenter**

`src/lib/listing-text-search.ts` :

```ts
import { sql, type SQL } from "drizzle-orm";

// Colonne générée non déclarée dans le schéma Drizzle → référencée en SQL brut.
const SEARCH_VECTOR = sql.raw('"listings"."search_vector"');

/** Texte libre exploitable pour le full-text, ou null. */
export function normalizeTextQuery(q: string | undefined): string | null {
  const t = (q ?? "").trim().replace(/\s+/g, " ");
  return t.length >= 2 ? t : null;
}

/** Expression ts_rank (signal lexical). Le texte doit être pré-validé. */
export function lexRankExpr(text: string): SQL {
  return sql`ts_rank(${SEARCH_VECTOR}, plainto_tsquery('fr_unaccent', ${text}))`;
}

/** Condition de correspondance plein-texte (pour le plancher de pertinence). */
export function textMatchCondition(text: string): SQL {
  return sql`${SEARCH_VECTOR} @@ plainto_tsquery('fr_unaccent', ${text})`;
}
```

> `search_vector` est une colonne générée gérée en SQL (Task 6), donc absente de l'objet Drizzle `listings` ; on la référence via `sql.raw`. La table est filtrée sur `status='active'` etc. dans le même `FROM listings`, donc le préfixe `"listings".` est valable.

- [ ] **Step 4: Vérifier le passage**

Run: `npx vitest run src/lib/listing-text-search.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/listing-text-search.ts src/lib/listing-text-search.test.ts
git commit -m "feat(search): helpers full-text FR (tsquery, ts_rank)"
```

---

## Task 11 : Param `q` dans les filtres et la validation

**Files:**
- Modify: `src/lib/search-filters.ts`
- Modify: `src/lib/validation.ts`
- Test: `src/lib/search-filters.test.ts` (créer si absent)

- [ ] **Step 1: Écrire le test qui échoue**

```ts
import { describe, expect, it } from "vitest";
import { parseFilters, toParams } from "@/lib/search-filters";

describe("filtre q (texte libre)", () => {
  it("se parse depuis les params", () => {
    const f = parseFilters((k) => (k === "q" ? "maison lumineuse" : null));
    expect(f.q).toBe("maison lumineuse");
  });
  it("se sérialise", () => {
    expect(toParams({ q: "maison lumineuse" }).get("q")).toBe("maison lumineuse");
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/lib/search-filters.test.ts`
Expected: FAIL — `q` non géré.

- [ ] **Step 3: Implémenter**

Dans `src/lib/search-filters.ts` :
- Ajouter `q?: string` au type `Filters` (`export type Filters = SearchFilters & { sort?: SortKey; q?: string };`).
- Dans `parseFilters` : `const q = get("q"); if (q) f.q = q;`
- Dans `toParams` : `if (filters.q) p.set("q", filters.q);`
- Dans `hasActiveFilters` : ajouter `|| !!filters.q`.

Dans `src/lib/validation.ts`, `listingsQuerySchema`, ajouter : `q: z.string().max(200).optional(),`

- [ ] **Step 4: Vérifier le passage**

Run: `npx vitest run src/lib/search-filters.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/search-filters.ts src/lib/validation.ts src/lib/search-filters.test.ts
git commit -m "feat(search): paramètre q (texte libre) dans filtres + validation"
```

---

## Task 12 : Intégration du ranking hybride dans `/api/listings`

**Files:**
- Modify: `src/app/api/listings/route.ts`

- [ ] **Step 1: Calculer les signaux dans le SELECT**

Au début du handler, après le parse, dériver le texte et l'embedding de requête :

```ts
import { normalizeTextQuery, lexRankExpr, textMatchCondition } from "@/lib/listing-text-search";
import { embed } from "@/lib/llm/embeddings";
import { computeRelevanceScore } from "@/lib/search-ranking";
import { sql } from "drizzle-orm";
// ...
const textQ = normalizeTextQuery(q.q);
const queryVec = textQ ? await embed(textQ) : null;
const vecLiteral = queryVec
  ? sql`ARRAY[${sql.join(queryVec.map((n) => sql`${n}`), sql`,`)}]::real[]`
  : null;
```

- [ ] **Step 2: Ajouter les colonnes de signaux**

Dans `.select({ ... })`, ajouter :

```ts
      lexRank: textQ ? sql<number>`${lexRankExpr(textQ)}` : sql<number | null>`null`,
      cosine: vecLiteral
        ? sql<number | null>`cosine_similarity(${listings.embedding}, ${vecLiteral})`
        : sql<number | null>`null`,
      createdAtTs: listings.createdAt,
      confScore: listings.confidenceScore,
```
(`distanceM` est déjà sélectionné depuis Task 2.)

- [ ] **Step 3: Plancher de pertinence pour requête purement textuelle**

Si `textQ` est présent et qu'aucun filtre structurel fort n'est actif (ni `bbox`, ni `fokontany`, ni rayon, ni prix/type), restreindre aux annonces pertinentes :

```ts
if (textQ && !bbox && !locFilter && q.minPrice == null && q.maxPrice == null && !q.txn && !q.propertyType) {
  const floor = vecLiteral
    ? sql`(${textMatchCondition(textQ)} OR cosine_similarity(${listings.embedding}, ${vecLiteral}) > 0.2)`
    : textMatchCondition(textQ);
  conditions.push(floor);
}
```

- [ ] **Step 4: Trier par score hybride en TS pour `sort=relevance`**

Remplacer la logique d'ordre de Task 2 : pour `sort=relevance`, **ne pas** ordonner en SQL ; récupérer le jeu candidat (garder `limit` côté SQL à 200 max), puis trier en TS :

```ts
const isRelevance = (q.sort ?? "relevance") === "relevance";
// ... exécuter la requête sans orderBy hybride (orderBy = createdAt desc par défaut) ...
let ranked = rows;
if (isRelevance) {
  const now = new Date();
  ranked = [...rows]
    .map((r) => ({
      r,
      score: computeRelevanceScore(
        {
          lexRank: r.lexRank ?? null,
          cosine: r.cosine ?? null,
          distanceM: r.distanceM ?? null,
          confidence: r.confScore ?? null,
          createdAt: r.createdAtTs,
        },
        { radiusKm: q.radiusKm ?? null, now },
      ),
    }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.r);
}
```
Mapper `ranked` (au lieu de `rows`) vers la réponse client. Conserver les tris SQL explicites (`price_asc`, etc.) inchangés.

- [ ] **Step 5: Vérifier contre la vraie DB**

Run (après `npm run dev`) :
```bash
npx tsx -e "fetch('http://localhost:3000/api/listings?q=appartement%20lumineux%20proche%20centre&sort=relevance').then(r=>r.json()).then(d=>console.log(d.listings.slice(0,5).map(l=>l.title)))"
```
Expected: résultats ordonnés par pertinence, requête purement textuelle ne renvoyant pas tout le catalogue.

Run lint : `npm run lint`
Expected: pas d'erreur.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/listings/route.ts
git commit -m "feat(search): ranking hybride (lexical+sémantique+géo) sur sort=relevance"
```

---

## Task 13 : Cache NLP Redis

**Files:**
- Create: `src/lib/llm/nlp-cache.ts`
- Test: `src/lib/llm/nlp-cache.test.ts`
- Modify: `src/lib/llm/openai.ts`

- [ ] **Step 1: Écrire le test qui échoue (clé stable)**

```ts
import { describe, expect, it } from "vitest";
import { nlpCacheKey } from "@/lib/llm/nlp-cache";

describe("nlpCacheKey", () => {
  it("est stable pour mêmes entrées", () => {
    const h = [{ role: "user" as const, content: "salut" }];
    expect(nlpCacheKey("maison", h)).toBe(nlpCacheKey("maison", h));
  });
  it("diffère quand la requête change", () => {
    expect(nlpCacheKey("maison", [])).not.toBe(nlpCacheKey("villa", []));
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/lib/llm/nlp-cache.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implémenter**

`src/lib/llm/nlp-cache.ts` :

```ts
import crypto from "node:crypto";
import { redis } from "@/lib/redis";
import type { ChatMessage, ConversationalResult } from "./openai";

const TTL_SECONDS = 3600;
const PREFIX = "nlp:v1:";

export function nlpCacheKey(query: string, history: ChatMessage[]): string {
  const payload = JSON.stringify({ q: query.trim().toLowerCase(), h: history.slice(-6) });
  return PREFIX + crypto.createHash("sha256").update(payload).digest("hex");
}

export async function getCachedNlp(
  query: string,
  history: ChatMessage[],
): Promise<ConversationalResult | null> {
  try {
    const raw = await redis.get(nlpCacheKey(query, history));
    return raw ? (JSON.parse(raw) as ConversationalResult) : null;
  } catch {
    return null;
  }
}

export async function setCachedNlp(
  query: string,
  history: ChatMessage[],
  result: ConversationalResult,
): Promise<void> {
  try {
    await redis.set(nlpCacheKey(query, history), JSON.stringify(result), "EX", TTL_SECONDS);
  } catch {
    /* no-op : Redis indispo */
  }
}
```

- [ ] **Step 4: Brancher dans `conversationalSearch`**

Dans `src/lib/llm/openai.ts`, au tout début de `conversationalSearch`, avant l'appel OpenAI :

```ts
import { getCachedNlp, setCachedNlp } from "./nlp-cache";
// ...
const cached = await getCachedNlp(query, history);
if (cached) return cached;
```
Et avant chaque `return` d'un résultat **issu d'OpenAI** (source `"openai"`), appeler `await setCachedNlp(query, history, result)`. Ne pas mettre en cache le fallback (peu coûteux, et l'on veut re-tenter OpenAI ensuite).

- [ ] **Step 5: Vérifier le passage**

Run: `npx vitest run src/lib/llm/nlp-cache.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/llm/nlp-cache.ts src/lib/llm/nlp-cache.test.ts src/lib/llm/openai.ts
git commit -m "feat(search): cache Redis des extractions NLP"
```

---

## Task 14 : Vérification globale

- [ ] **Step 1: Suite de tests complète**

Run: `npx vitest run`
Expected: tous verts.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: aucune erreur.

- [ ] **Step 3: Smoke tests bout-en-bout (DB réelle, `npm run dev`)**

```bash
# 1) Conversationnel : requête texte + lieu + rayon
curl -s -X POST localhost:3000/api/search/conversational -H 'content-type: application/json' \
  -d '{"query":"maison lumineuse a vendre autour d Analakelyy sur un rayon de 5 km"}' | head
# 2) Listings ranking hybride
curl -s 'localhost:3000/api/listings?q=appartement%20calme%20avec%20jardin&sort=relevance' | head
```
Expected : (1) lieu géocodé malgré la faute, type house sans exclusion villa, résumé cohérent ; (2) résultats classés par pertinence avec `distanceM`/scores.

- [ ] **Step 4: Commit final éventuel (docs/cleanup)**

```bash
git add -A
git commit -m "chore(search): vérification finale recherche hybride" || echo "rien à committer"
```

---

## Notes d'implémentation

- **Dégradation** : sans `OPENAI_API_KEY`, `embed` renvoie `null` → `cosine` neutre, le ranking repose sur lexical+géo+confiance+fraîcheur. Sans `REDIS_URL` joignable, le cache NLP est un no-op. Nominatim/PostGIS indisponibles → replis déjà en place.
- **Colonne générée `search_vector`** : non gérée par Drizzle ; toute modification ultérieure du schéma ne doit pas la supprimer (vérifier les diffs `db:generate`).
- **Migration vers pgvector (futur)** : remplacer `cosine_similarity(embedding, vec)` par l'opérateur `<=>` et un index, sans changer `search-ranking.ts` ni l'API `/api/listings`.
- **Pondérations** : `RELEVANCE_WEIGHTS` dans `search-ranking.ts` est le seul point de réglage.
```
