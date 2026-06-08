import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import pThrottle from "p-throttle";
import { fetch } from "undici";
import { db } from "@/db/client";
import { geocodeCache } from "@/db/schema";

const NOMINATIM_URL =
  process.env.NOMINATIM_URL ?? "https://nominatim.openstreetmap.org";
const USER_AGENT =
  process.env.SCRAPER_USER_AGENT ??
  "ImmoMgBot/0.1 (+contact@immo.mg)";

// Bounding box Grand Antananarivo (viewbox = lon1,lat1,lon2,lat2).
const TANA_VIEWBOX = "47.40,-19.00,47.60,-18.78";
const MIN_IMPORTANCE = 0.2;

const throttle = pThrottle({ limit: 1, interval: 1100 });
const memoryCache = new Map<string, { lng: number; lat: number } | null>();

function hash(address: string): string {
  return crypto
    .createHash("sha256")
    .update(address.trim().toLowerCase())
    .digest("hex");
}

type NominatimResult = { lon: string; lat: string; importance?: number };

const NOMINATIM_TIMEOUT_MS = 15_000;

export type GeocodeOpts = {
  biasTana?: boolean;
  viewbox?: string;
  /** Ne pas rejeter un POI à faible score d'importance (recherche de lieu). */
  lenient?: boolean;
};

// Réessais sur échec réseau transitoire (Nominatim public = parfois lent/429).
const MAX_ATTEMPTS = 3;
const RETRY_BACKOFF_MS = 300;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Viewbox effectif : explicite > biais Tana > aucun. */
function resolveViewbox(opts: GeocodeOpts): string | null {
  if (opts.viewbox) return opts.viewbox;
  if (opts.biasTana) return TANA_VIEWBOX;
  return null;
}

export function buildNominatimUrl(query: string, opts: GeocodeOpts = {}): URL {
  const url = new URL(`${NOMINATIM_URL}/search`);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "mg");
  url.searchParams.set("addressdetails", "0");
  const viewbox = resolveViewbox(opts);
  if (viewbox) {
    url.searchParams.set("viewbox", viewbox);
    url.searchParams.set("bounded", "1");
  }
  return url;
}

// Lève sur un échec transitoire (réseau, timeout, HTTP ≥400) ; renvoie null
// seulement pour un « vrai » non-résultat (réponse vide / importance trop
// faible). geocode() distingue les deux pour ne PAS mettre en cache un échec.
const callNominatim = throttle(async (query: string, opts: GeocodeOpts = {}) => {
  const url = buildNominatimUrl(query, opts);
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, "Accept-Language": "fr,en" },
    signal: AbortSignal.timeout(NOMINATIM_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
  const body = (await res.json()) as NominatimResult[];
  if (body.length === 0) return null;
  const first = body[0];
  // Filtre d'importance seulement quand on ne contraint pas géographiquement
  // (viewbox) et qu'on n'est pas en mode souple : sinon un POI nommé légitime
  // mais à faible score (ex. la Primature) serait rejeté à tort.
  if (
    !resolveViewbox(opts) &&
    !opts.lenient &&
    typeof first.importance === "number" &&
    first.importance < MIN_IMPORTANCE
  ) {
    return null;
  }
  return {
    lng: Number(first.lon),
    lat: Number(first.lat),
  };
});

// Appelle Nominatim avec réessais : ne laisse pas un échec réseau ponctuel
// faire croire que le lieu est introuvable. Un vrai « aucun résultat » (null)
// n'est pas réessayé.
async function callNominatimResilient(
  query: string,
  opts: GeocodeOpts,
): Promise<{ lng: number; lat: number } | null> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await callNominatim(query, opts);
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_ATTEMPTS) await sleep(RETRY_BACKOFF_MS * attempt);
    }
  }
  throw lastErr;
}

export async function geocode(
  address: string,
  opts: GeocodeOpts = {},
): Promise<{ lng: number; lat: number } | null> {
  const query = address.trim();
  if (!query) return null;
  const viewbox = resolveViewbox(opts);
  const key = hash(query + (viewbox ? `|vb:${viewbox}` : ""));

  if (memoryCache.has(key)) return memoryCache.get(key) ?? null;

  // Mode hors-réseau (tests/CI) : ni réseau ni cache DB.
  if (process.env.GEOCODE_SKIP_NETWORK === "true") {
    memoryCache.set(key, null);
    return null;
  }

  const cached = await db
    .select()
    .from(geocodeCache)
    .where(eq(geocodeCache.addressHash, key))
    .limit(1);
  if (cached.length > 0) {
    const found = { lng: cached[0].lng, lat: cached[0].lat };
    memoryCache.set(key, found);
    return found;
  }

  const queryWithCountry = /madagascar/i.test(query)
    ? query
    : `${query}, Madagascar`;
  let result: { lng: number; lat: number } | null;
  try {
    result = await callNominatimResilient(queryWithCountry, opts);
  } catch (err) {
    // Échec transitoire (réseau, timeout, 429/5xx) : ne PAS mettre en cache
    // négatif, sinon une panne ponctuelle gèle la requête pour tout le process.
    // La prochaine tentative réessaiera.
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[geocode] Nominatim indisponible: ${msg}`);
    return null;
  }
  if (!result) {
    // Vrai « aucun résultat » → cache négatif légitime.
    memoryCache.set(key, null);
    return null;
  }

  await db
    .insert(geocodeCache)
    .values({ addressHash: key, lng: result.lng, lat: result.lat })
    .onConflictDoNothing();
  memoryCache.set(key, result);
  return result;
}
