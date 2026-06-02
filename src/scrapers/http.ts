import { fetch } from "undici";

const USER_AGENT =
  process.env.SCRAPER_USER_AGENT ??
  "ImmoMgBot/0.1 (+contact@immo.mg)";

export async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html",
        "Accept-Language": "fr,en;q=0.8",
      },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}
