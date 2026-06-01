import * as cheerio from "cheerio";
import pThrottle from "p-throttle";
import { fetchHtml } from "../http";
import type { RawListing, Scraper } from "../types";

const BASE = "https://mg.coinafrique.com";
const CATEGORY_PATHS = [
  "/categorie/immobilier",
  "/categorie/villas",
  "/categorie/appartements-a-louer",
  "/categorie/maisons-a-louer",
  "/categorie/terrains",
];
const MAX_PAGES_PER_CATEGORY = Number(
  process.env.COINAFRIQUE_MAX_PAGES ?? "2",
);
const FETCH_DETAILS = process.env.COINAFRIQUE_FETCH_DETAILS !== "false";

const throttle = pThrottle({ limit: 1, interval: 2000 });
const throttledFetch = throttle(fetchHtml);

function extractIdFromUrl(href: string): string | null {
  const match = /(\d+)(?:\/?$)/.exec(href);
  return match ? match[1] : null;
}

type CardSummary = {
  detailUrl: string;
  externalId: string;
  title: string;
  rawPrice: string;
  rawAddress: string;
  thumbnail: string | null;
};

function parseListPage(html: string): CardSummary[] {
  const $ = cheerio.load(html);
  const items: CardSummary[] = [];
  $(".ad__card").each((_, el) => {
    const card = $(el);
    const link = card.find("a.ad__card-image").first();
    const href = link.attr("href");
    if (!href) return;
    const id = extractIdFromUrl(href);
    if (!id) return;
    const detailUrl = href.startsWith("http") ? href : `${BASE}${href}`;
    items.push({
      detailUrl,
      externalId: id,
      title:
        card.find(".ad__card-description a").text().trim() ||
        link.attr("title") ||
        "",
      rawPrice: card.find(".ad__card-price").text().trim(),
      rawAddress: card.find(".ad__card-location span").text().trim(),
      thumbnail: card.find("img.ad__card-img").attr("src") ?? null,
    });
  });
  return items;
}

type DetailExtras = {
  description: string;
  rawSurface: string | null;
  rawRooms: string | null;
  imageUrls: string[];
};

function parseDetailPage(html: string, thumbnail: string | null): DetailExtras {
  const $ = cheerio.load(html);
  const description = $(".ad__info__box-descriptions p:not(.title)")
    .first()
    .text()
    .trim();

  let rawSurface: string | null = null;
  let rawRooms: string | null = null;
  $(".details-characteristics li").each((_, el) => {
    const label = $(el).find("span").first().text().toLowerCase();
    const value = $(el).find("span.qt").text().trim();
    if (label.includes("pièces") || label.includes("pieces")) rawRooms = value;
    else if (label.includes("superficie")) rawSurface = `${value} m`;
  });

  const imageUrls: string[] = [];
  $(".slider img, .swiper-slide img").each((_, el) => {
    const src = $(el).attr("src") ?? $(el).attr("data-src");
    if (src && /^https?:\/\//.test(src) && !imageUrls.includes(src)) {
      imageUrls.push(src);
    }
  });
  if (thumbnail && imageUrls.length === 0) imageUrls.push(thumbnail);
  return { description, rawSurface, rawRooms, imageUrls };
}

export const coinAfriqueScraper: Scraper = {
  id: "coinafrique",
  isEnabled() {
    return true;
  },
  async *fetchListings(): AsyncIterable<RawListing> {
    const seen = new Set<string>();
    for (const path of CATEGORY_PATHS) {
      const isLocation = path.includes("a-louer");
      for (let page = 1; page <= MAX_PAGES_PER_CATEGORY; page++) {
        const url = page === 1 ? `${BASE}${path}` : `${BASE}${path}?page=${page}`;
        const html = await throttledFetch(url);
        if (!html) break;
        const cards = parseListPage(html);
        if (cards.length === 0) break;
        for (const card of cards) {
          if (seen.has(card.externalId)) continue;
          seen.add(card.externalId);
          let extras: DetailExtras = {
            description: "",
            rawSurface: null,
            rawRooms: null,
            imageUrls: card.thumbnail ? [card.thumbnail] : [],
          };
          if (FETCH_DETAILS) {
            const detailHtml = await throttledFetch(card.detailUrl);
            if (detailHtml) extras = parseDetailPage(detailHtml, card.thumbnail);
          }
          yield {
            source: "coinafrique",
            externalId: card.externalId,
            externalUrl: card.detailUrl,
            title: card.title,
            description: extras.description || card.title,
            rawPrice: card.rawPrice,
            rawType: path,
            rawTransaction: isLocation ? "location" : "vente",
            rawAddress: card.rawAddress,
            rawSurface: extras.rawSurface,
            rawRooms: extras.rawRooms,
            imageUrls: extras.imageUrls,
          };
        }
      }
    }
  },
};
