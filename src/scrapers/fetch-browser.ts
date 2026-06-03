import { fetch } from "undici";

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/** Fetch HTML from sites that block the default scraper User-Agent. */
export async function fetchBrowserHtml(url: string): Promise<string | null> {
  const retries = Number(process.env.SCRAPER_FETCH_RETRIES ?? "3");
  const origin = new URL(url).origin;
  const headers = {
    "User-Agent": BROWSER_USER_AGENT,
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
    Referer: `${origin}/`,
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin",
    "Upgrade-Insecure-Requests": "1",
  };
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, { headers });
      if (res.ok) return await res.text();
    } catch {
      /* retry */
    }
    if (attempt < retries - 1) {
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  return null;
}
