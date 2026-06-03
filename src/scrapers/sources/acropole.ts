import * as cheerio from "cheerio";
import pThrottle from "p-throttle";
import { fetchHtml } from "../http";
import { parsePriceAriary } from "../normalize";
import type { RawListing, Scraper } from "../types";

const BASE = "https://www.acropole-immo.net";
const MAX_PAGES = Number(process.env.ACROPOLE_MAX_PAGES ?? "3");
const FETCH_DETAILS = process.env.ACROPOLE_FETCH_DETAILS !== "false";
const EUR_TO_AR = Number(process.env.ACROPOLE_EUR_TO_AR_RATE ?? "4800");

type IndexConfig = {
  path: string;
  kRubr: "LOC" | "VEN";
  kType: string;
  rawTransaction: string;
};

const INDEXES: IndexConfig[] = [
  {
    path: "/annonces/location/appartement/madagascar/",
    kRubr: "LOC",
    kType: "APP",
    rawTransaction: "location",
  },
  {
    path: "/annonces/vente/appartement/madagascar/",
    kRubr: "VEN",
    kType: "APP",
    rawTransaction: "vente",
  },
];

const DETAIL_HREF_RE = /madagascar\/[a-z0-9-]+-(\d+)\/?$/i;

const throttle = pThrottle({ limit: 1, interval: 2500 });
const throttledFetch = throttle((url: string) =>
  fetchHtml(url, { browserLike: true }),
);

export function eurPriceToAriaryString(raw: string): string | null {
  const cleaned = decodeHtmlEntities(raw);
  const m =
    /(\d[\d\s]*)\s*(?:€|\u0080|&euro;|EUR)?\s*\/?\s*mois/i.exec(cleaned) ??
    /(\d[\d\s]*)\s*(?:€|\u0080|&euro;)/i.exec(cleaned);
  if (!m) return null;
  const eur = parsePriceAriary(m[1]);
  if (eur <= 0) return null;
  return `${Math.round(eur * EUR_TO_AR)} Ar`;
}

export function buildAcropolePageUrl(
  indexPath: string,
  cfg: IndexConfig,
  page: number,
): string {
  const canonical = `${BASE}${indexPath}`;
  const params = new URLSearchParams({
    k_rubr: cfg.kRubr,
    k_type: cfg.kType,
    k_pays: "MADAGASCAR",
    k_depart: "0",
    url_page: canonical,
    op_page: String(page),
    op_tri: "0",
  });
  return `${canonical}?${params.toString()}`;
}

type CardSummary = {
  detailUrl: string;
  externalId: string;
  title: string;
  rawPrice: string;
  rawAddress: string;
  rawSurface: string | null;
  rawRooms: string | null;
  thumbnail: string | null;
};

const CARD_BLOCK_RE =
  /<table\s+class="biens_lig_cadre"[\s\S]*?<\/table>/gi;

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&euro;/gi, "€")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseAcropoleListPage(html: string): CardSummary[] {
  const items: CardSummary[] = [];
  const seen = new Set<string>();
  const blocks = html.match(CARD_BLOCK_RE) ?? [];

  for (const blockHtml of blocks) {
    const hrefMatch = blockHtml.match(
      /href="(https:\/\/www\.acropole-immo\.net\/annonces\/[^"]*madagascar\/[^"]+-(\d+)\/)"/i,
    );
    if (!hrefMatch) continue;
    const detailUrl = hrefMatch[1];
    const externalId = hrefMatch[2];
    if (seen.has(externalId)) continue;
    seen.add(externalId);

    const infoTexts = [
      ...blockHtml.matchAll(/font class=['"]infos_texte2['"]>([^<]*)</gi),
    ].map((m) => decodeHtmlEntities(m[1]));

    const location =
      infoTexts.find((t) => /madagascar|antanarivo/i.test(t)) ??
      infoTexts[0] ??
      "";
    const priceCell = infoTexts.find((t) => /mois|€|eur/i.test(t)) ?? "";
    const ariary = eurPriceToAriaryString(priceCell);
    if (!ariary) continue;

    const titleMatches = [
      ...blockHtml.matchAll(/font class=['"]biens_lig_texte1['"]>([^<]*)</gi),
    ].map((m) => decodeHtmlEntities(m[1]));
    const title =
      titleMatches.find((t) => t.length > 12) ??
      titleMatches[titleMatches.length - 1] ??
      location;

    const blockText = decodeHtmlEntities(blockHtml.replace(/<[^>]+>/g, " "));
    const surfaceMatch = /(\d+)\s*m²/i.exec(blockText);
    const roomsMatch = /(\d+)\s*pièces/i.exec(blockText);

    const thumbMatch = new RegExp(
      `(https?://[^"'\\s]+/${externalId}[^"'\\s]*\\.jpg)`,
      "i",
    ).exec(html);
    const thumbnail = thumbMatch?.[1] ?? null;

    items.push({
      detailUrl,
      externalId,
      title: title || location,
      rawPrice: ariary,
      rawAddress: location || "Antananarivo, Madagascar",
      rawSurface: surfaceMatch ? `${surfaceMatch[1]} m` : null,
      rawRooms: roomsMatch ? roomsMatch[1] : null,
      thumbnail,
    });
  }

  return items;
}

function parseAcropoleDetailPage(
  html: string,
  thumbnail: string | null,
): { description: string; imageUrls: string[] } {
  const $ = cheerio.load(html);
  const description =
    $('meta[name="description"]').attr("content")?.trim() ||
    $("font.biens_lig_texte1").first().text().trim() ||
    "";

  const imageUrls: string[] = [];
  $("img").each((_, el) => {
    const src = $(el).attr("src");
    if (src && /_1\.jpg|_1_/.test(src) && src.startsWith("http")) {
      if (!imageUrls.includes(src)) imageUrls.push(src);
    }
  });
  if (thumbnail && imageUrls.length === 0) imageUrls.push(thumbnail);
  return { description, imageUrls };
}

export const acropoleScraper: Scraper = {
  id: "acropole",
  isEnabled() {
    return process.env.ACROPOLE_SCRAPER_ENABLED !== "false";
  },
  async *fetchListings(): AsyncIterable<RawListing> {
    const seen = new Set<string>();
    for (const index of INDEXES) {
      for (let page = 1; page <= MAX_PAGES; page++) {
        const url = buildAcropolePageUrl(index.path, index, page);
          const html = await throttledFetch(url);
          if (!html) {
            console.warn(`[acropole] fetch failed: ${url}`);
            break;
          }
          const cards = parseAcropoleListPage(html);
          if (cards.length === 0) break;
        for (const card of cards) {
          if (seen.has(card.externalId)) continue;
          seen.add(card.externalId);
          let description = card.title;
          let imageUrls = card.thumbnail ? [card.thumbnail] : [];
          if (FETCH_DETAILS) {
            const detailHtml = await throttledFetch(card.detailUrl);
            if (detailHtml) {
              const extras = parseAcropoleDetailPage(detailHtml, card.thumbnail);
              description = extras.description || description;
              imageUrls = extras.imageUrls.length > 0 ? extras.imageUrls : imageUrls;
            }
          }
          yield {
            source: "acropole",
            externalId: card.externalId,
            externalUrl: card.detailUrl,
            title: card.title,
            description,
            rawPrice: card.rawPrice,
            rawType: index.path,
            rawTransaction: index.rawTransaction,
            rawAddress: card.rawAddress,
            rawSurface: card.rawSurface,
            rawRooms: card.rawRooms,
            imageUrls,
          };
        }
      }
    }
  },
};
