import { fetch } from "undici";

const USER_AGENT =
  process.env.SCRAPER_USER_AGENT ??
  "ImmoMgBot/0.1 (+contact@immo.mg)";

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export type FetchHtmlOptions = {
  /** Use a browser-like User-Agent (needed for sites with WAF, e.g. e-trano). */
  browserLike?: boolean;
  accept?: string;
};

async function fetchHtmlOnce(
  url: string,
  options: FetchHtmlOptions,
): Promise<string | null> {
  const ua = options.browserLike ? BROWSER_USER_AGENT : USER_AGENT;
  const accept =
    options.accept ??
    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";
  const headers: Record<string, string> = {
    "User-Agent": ua,
    Accept: accept,
    "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
  };
  if (options.browserLike) {
    headers.Referer = new URL(url).origin + "/";
    headers["Sec-Fetch-Dest"] = "document";
    headers["Sec-Fetch-Mode"] = "navigate";
    headers["Sec-Fetch-Site"] = "none";
  }
  const res = await fetch(url, { headers });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  const ctype = res.headers.get("content-type") ?? "";
  if (/charset=iso-8859-1/i.test(ctype) || /acropole-immo/i.test(url)) {
    return buf.toString("latin1");
  }
  return buf.toString("utf8");
}

export async function fetchHtml(
  url: string,
  options: FetchHtmlOptions = {},
): Promise<string | null> {
  const retries = Number(process.env.SCRAPER_FETCH_RETRIES ?? "3");
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const body = await fetchHtmlOnce(url, options);
      if (body) return body;
    } catch {
      /* retry */
    }
    if (attempt < retries - 1) {
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  return null;
}
