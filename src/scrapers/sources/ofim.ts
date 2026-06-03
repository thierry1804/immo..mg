import * as cheerio from "cheerio";
import { extractLocationPhrase } from "@/lib/listing-location";
import { fetchHtml } from "../http";
import { parsePriceAriary } from "../normalize";
import type { RawListing, Scraper } from "../types";

const RSS_URL = "https://www.ofim.mg/rss.php";

const PRICE_RE = /(\d[\d\s.]*)\s*ar\b/i;

export function extractOfimId(url: string): string | null {
  const m = /\/(\d+)\//.exec(url);
  return m ? m[1] : null;
}

export function extractFirstAriaryPrice(text: string): string | null {
  const m = PRICE_RE.exec(text);
  if (!m) return null;
  const n = parsePriceAriary(m[0]);
  return n > 0 ? String(n) : null;
}

export function stripHtml(html: string): string {
  return cheerio.load(html).root().text().replace(/\s+/g, " ").trim();
}

export function parseOfimRssItem(itemXml: string): Omit<RawListing, "source"> | null {
  const $ = cheerio.load(itemXml, { xml: true });
  const link = $("link").first().text().trim();
  const id = extractOfimId(link);
  if (!id || !link) return null;

  const title = $("title").first().text().trim().replace(/&#39;/g, "'");
  const descHtml = $("description").first().text();
  const description = stripHtml(descHtml) || title;

  const categories = $("category")
    .map((_, el) => $(el).text().trim())
    .get();
  const locationCat = categories.find((c) => /madagascar/i.test(c));
  const fromTitle = extractLocationPhrase(title, description);
  const rawAddress = fromTitle
    ? `${fromTitle}, Antananarivo, Madagascar`
    : locationCat?.replace(/\s*-\s*Madagascar\s*$/i, "").trim() ||
      "Antananarivo, Madagascar";

  const priceSource = `${title} ${description}`;
  const rawPrice = extractFirstAriaryPrice(priceSource);
  if (!rawPrice) return null;

  const imageUrls: string[] = [];
  const imgMatch = /<img[^>]+src=["']([^"']+)["']/i.exec(descHtml);
  if (imgMatch?.[1]) imageUrls.push(imgMatch[1]);

  const txnCat = categories.find((c) => /^location$/i.test(c) || /^vente$/i.test(c));
  const rawTransaction =
    txnCat?.toLowerCase() === "vente"
      ? "vente"
      : /vente|à vendre|a vendre/i.test(title)
        ? "vente"
        : "location";

  return {
    externalId: id,
    externalUrl: link,
    title,
    description,
    rawPrice: `${rawPrice} Ar`,
    rawType: categories.find((c) => !/location|vente|madagascar/i.test(c)) ?? "ofim",
    rawTransaction,
    rawAddress,
    rawSurface: null,
    rawRooms: null,
    imageUrls,
  };
}

export function parseOfimRss(xml: string): Omit<RawListing, "source">[] {
  const $ = cheerio.load(xml, { xml: true });
  const out: Omit<RawListing, "source">[] = [];
  $("item").each((_, el) => {
    const parsed = parseOfimRssItem($.html(el));
    if (parsed) out.push(parsed);
  });
  return out;
}

export const ofimScraper: Scraper = {
  id: "ofim",
  isEnabled() {
    return process.env.OFIM_SCRAPER_ENABLED !== "false";
  },
  async *fetchListings(): AsyncIterable<RawListing> {
    const xml = await fetchHtml(RSS_URL, {
      accept: "application/rss+xml, application/xml, text/xml, */*",
    });
    if (!xml) {
      console.warn("[ofim] RSS fetch failed");
      return;
    }
    const items = parseOfimRss(xml);
    const seen = new Set<string>();
    for (const item of items) {
      if (seen.has(item.externalId)) continue;
      seen.add(item.externalId);
      yield { source: "ofim", ...item };
    }
  },
};
