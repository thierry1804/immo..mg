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

const callNominatim = throttle(async (query: string, opts: { biasTana?: boolean } = {}) => {
  const url = buildNominatimUrl(query, opts);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, "Accept-Language": "fr,en" },
      signal: AbortSignal.timeout(NOMINATIM_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as NominatimResult[];
    if (body.length === 0) return null;
    const first = body[0];
    if (typeof first.importance === "number" && first.importance < MIN_IMPORTANCE) {
      return null;
    }
    return {
      lng: Number(first.lon),
      lat: Number(first.lat),
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[geocode] Nominatim indisponible: ${msg}`);
    return null;
  }
});

export async function geocode(
  address: string,
  opts: { biasTana?: boolean } = {},
): Promise<{ lng: number; lat: number } | null> {
  const query = address.trim();
  if (!query) return null;
  const key = hash(query + (opts.biasTana ? "|tana" : ""));

  if (memoryCache.has(key)) return memoryCache.get(key) ?? null;

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

  if (process.env.GEOCODE_SKIP_NETWORK === "true") {
    memoryCache.set(key, null);
    return null;
  }

  const queryWithCountry = /madagascar/i.test(query)
    ? query
    : `${query}, Madagascar`;
  let result: { lng: number; lat: number } | null = null;
  try {
    result = await callNominatim(queryWithCountry, opts);
  } catch {
    result = null;
  }
  if (!result) {
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
