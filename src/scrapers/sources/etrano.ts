import * as cheerio from "cheerio";
import pThrottle from "p-throttle";
import { fetchBrowserHtml } from "../fetch-browser";
import { parsePriceAriary } from "../normalize";
import type { RawListing, Scraper } from "../types";

const BASE = "https://e-trano.com";
const MAX_PAGES = Number(process.env.ETRANO_MAX_PAGES ?? "3");
const FETCH_DETAILS = process.env.ETRANO_FETCH_DETAILS !== "false";

const INDEXES = [
  {
    url: `${BASE}/locations-biens-immobiliers/`,
    rawTransaction: "location",
  },
  {
    url: `${BASE}/ventes-biens-immobiliers/`,
    rawTransaction: "vente",
  },
];

const throttle = pThrottle({ limit: 1, interval: 2800 });
const throttledFetch = throttle(fetchBrowserHtml);

type CardSummary = {
  detailUrl: string;
  externalId: string;
  title: string;
  rawPrice: string;
  rawAddress: string;
  thumbnail: string | null;
};

export function parseEtranoListPage(html: string): CardSummary[] {
  const $ = cheerio.load(html);
  const items: CardSummary[] = [];
  const seen = new Set<string>();

  $('div[class*="card_anc-"]').each((_, el) => {
    const card = $(el);
    const link = card.find('a[href^="/annonce/"]').first();
    const href = link.attr("href");
    if (!href) return;
    const idMatch = /\/annonce\/(\d+)/.exec(href);
    if (!idMatch) return;
    const externalId = idMatch[1];
    if (seen.has(externalId)) return;
    seen.add(externalId);

    const detailUrl = href.startsWith("http") ? href : `${BASE}${href}`;
    const title = card.find("p.mt-1 strong").first().text().trim();
    const rawPriceText = card.find("h3.psd strong, h3 strong").first().text().trim();
    const rawAddress = card.find("p.mt-0").first().text().trim();
    const thumb = card.find("img").first().attr("src") ?? null;

    if (!title || !rawAddress) return;
    if (/sur demande/i.test(rawPriceText)) return;

    const priceNum = parsePriceAriary(rawPriceText);
    if (priceNum <= 0) return;

    items.push({
      detailUrl,
      externalId,
      title,
      rawPrice: `${priceNum} Ar`,
      rawAddress,
      thumbnail: thumb,
    });
  });

  return items;
}

function parseEtranoDetailPage(
  html: string,
  thumbnail: string | null,
): {
  description: string;
  rawPrice: string | null;
  rawSurface: string | null;
  rawRooms: string | null;
  imageUrls: string[];
} {
  const $ = cheerio.load(html);
  const description =
    $('meta[property="og:description"]').attr("content")?.trim() ||
    $("p").filter((_, el) => $(el).text().length > 80).first().text().trim() ||
    "";

  let rawPrice: string | null = null;
  $("h3 strong, .ariary strong, strong").each((_, el) => {
    const t = $(el).text().trim();
    if (/sur demande/i.test(t)) return;
    const n = parsePriceAriary(t);
    if (n > 0) {
      rawPrice = `${n} Ar`;
      return false;
    }
  });

  const roomsMatch = /(\d+)\s*chambre/i.exec($("body").text());
  const surfaceMatch = /(\d+)\s*m²/i.exec($("body").text());

  const imageUrls: string[] = [];
  $('img[src*="cloudfront"], .carousel img, a[data-fancybox] img').each((_, el) => {
    const src = $(el).attr("src") ?? $(el).attr("href");
    if (src && src.startsWith("http") && !imageUrls.includes(src)) {
      imageUrls.push(src);
    }
  });
  if (thumbnail && imageUrls.length === 0) imageUrls.push(thumbnail);

  return {
    description,
    rawPrice,
    rawSurface: surfaceMatch ? `${surfaceMatch[1]} m` : null,
    rawRooms: roomsMatch ? roomsMatch[1] : null,
    imageUrls,
  };
}

function listPageUrl(indexUrl: string, page: number): string {
  if (page <= 1) return indexUrl;
  const sep = indexUrl.includes("?") ? "&" : "?";
  return `${indexUrl}${sep}page=${page}`;
}

export const etranoScraper: Scraper = {
  id: "etrano",
  isEnabled() {
    return process.env.ETRANO_SCRAPER_ENABLED !== "false";
  },
  async *fetchListings(): AsyncIterable<RawListing> {
    const seen = new Set<string>();
    for (const index of INDEXES) {
      for (let page = 1; page <= MAX_PAGES; page++) {
        const url = listPageUrl(index.url, page);
        const html = await throttledFetch(url);
        if (!html) {
          console.warn(`[etrano] fetch failed: ${url}`);
          break;
        }
        const cards = parseEtranoListPage(html);
        if (cards.length === 0) break;
        for (const card of cards) {
          if (seen.has(card.externalId)) continue;
          seen.add(card.externalId);

          let description = card.title;
          let rawPrice = card.rawPrice;
          let rawSurface: string | null = null;
          let rawRooms: string | null = null;
          let imageUrls = card.thumbnail ? [card.thumbnail] : [];

          if (FETCH_DETAILS || parsePriceAriary(rawPrice) <= 0) {
            const detailHtml = await throttledFetch(card.detailUrl);
            if (detailHtml) {
              const extras = parseEtranoDetailPage(detailHtml, card.thumbnail);
              description = extras.description || description;
              if (extras.rawPrice) rawPrice = extras.rawPrice;
              rawSurface = extras.rawSurface;
              rawRooms = extras.rawRooms;
              if (extras.imageUrls.length > 0) imageUrls = extras.imageUrls;
            }
          }

          if (parsePriceAriary(rawPrice) <= 0) continue;

          yield {
            source: "etrano",
            externalId: card.externalId,
            externalUrl: card.detailUrl,
            title: card.title,
            description,
            rawPrice,
            rawType: index.url,
            rawTransaction: index.rawTransaction,
            rawAddress: card.rawAddress,
            rawSurface,
            rawRooms,
            imageUrls,
          };
        }
      }
    }
  },
};
