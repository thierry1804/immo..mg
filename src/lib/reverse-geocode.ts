import pThrottle from "p-throttle";
import { fetch } from "undici";

const NOMINATIM_URL =
  process.env.NOMINATIM_URL ?? "https://nominatim.openstreetmap.org";
const USER_AGENT =
  process.env.SCRAPER_USER_AGENT ??
  "ImmoMgBot/0.1 (+contact@immo.mg)";

const throttle = pThrottle({ limit: 1, interval: 1100 });

type NominatimReverse = { display_name?: string };

export const reverseGeocode = throttle(
  async (lng: number, lat: number): Promise<string | null> => {
    const url = new URL(`${NOMINATIM_URL}/reverse`);
    url.searchParams.set("lon", String(lng));
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("format", "json");
    url.searchParams.set("zoom", "18");
    url.searchParams.set("addressdetails", "0");
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, "Accept-Language": "fr,en" },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as NominatimReverse;
    return body.display_name ?? null;
  },
);
