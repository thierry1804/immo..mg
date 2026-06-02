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

const throttle = pThrottle({ limit: 1, interval: 1100 });
const memoryCache = new Map<string, { lng: number; lat: number } | null>();

function hash(address: string): string {
  return crypto
    .createHash("sha256")
    .update(address.trim().toLowerCase())
    .digest("hex");
}

type NominatimResult = { lon: string; lat: string };

const callNominatim = throttle(async (query: string) => {
  const url = new URL(`${NOMINATIM_URL}/search`);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "mg");
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, "Accept-Language": "fr,en" },
  });
  if (!res.ok) return null;
  const body = (await res.json()) as NominatimResult[];
  if (body.length === 0) return null;
  return {
    lng: Number(body[0].lon),
    lat: Number(body[0].lat),
  };
});

export async function geocode(
  address: string,
): Promise<{ lng: number; lat: number } | null> {
  const query = address.trim();
  if (!query) return null;
  const key = hash(query);

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

  const queryWithCountry = /madagascar/i.test(query)
    ? query
    : `${query}, Madagascar`;
  const result = await callNominatim(queryWithCountry);
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
