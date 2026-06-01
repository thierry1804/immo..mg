import crypto from "node:crypto";
import * as cheerio from "cheerio";
import pThrottle from "p-throttle";
import { fetchHtml } from "./http";
import type { RawListing, Scraper } from "./types";
import type { ScrapeSource, SourceSelectors } from "@/db/schema";

function absUrl(href: string, baseUrl: string): string | null {
  if (!href) return null;
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

function externalIdFromUrl(url: string): string {
  return crypto.createHash("sha1").update(url).digest("hex").slice(0, 24);
}

export function buildDynamicScraper(source: ScrapeSource): Scraper {
  const selectors = source.selectors as SourceSelectors;
  const throttle = pThrottle({
    limit: 1,
    interval: Math.max(500, source.throttleMs),
  });
  const throttledFetch = throttle(fetchHtml);

  return {
    id: source.slug,
    isEnabled() {
      return source.enabled;
    },
    async *fetchListings(): AsyncIterable<RawListing> {
      const txnDefault = source.defaultTransactionType?.toLowerCase() ?? "";
      const seen = new Set<string>();
      for (const listUrl of source.listUrls) {
        for (let page = 1; page <= Math.max(1, source.maxPages); page++) {
          const url =
            page === 1
              ? listUrl
              : listUrl.includes("?")
                ? `${listUrl}&page=${page}`
                : `${listUrl}?page=${page}`;
          const html = await throttledFetch(url);
          if (!html) {
            console.warn(`[${source.slug}] fetch failed: ${url}`);
            break;
          }
          const $ = cheerio.load(html);
          const cards = $(selectors.card);
          if (cards.length === 0) break;
          for (let i = 0; i < cards.length; i++) {
            const $card = cards.eq(i);
            const link = $card.find(selectors.link).first();
            const href = link.attr("href") ?? link.attr("data-href") ?? "";
            const detailUrl = absUrl(href, source.baseUrl);
            if (!detailUrl) continue;
            const externalId = externalIdFromUrl(detailUrl);
            if (seen.has(externalId)) continue;
            seen.add(externalId);
            const title =
              $card.find(selectors.title).first().text().trim() ||
              link.attr("title") ||
              "";
            const rawPrice = $card.find(selectors.price).first().text().trim();
            const rawAddress = $card
              .find(selectors.address)
              .first()
              .text()
              .trim();
            if (!title || !rawPrice || !rawAddress) continue;
            let image: string | null = null;
            if (selectors.image) {
              const img = $card.find(selectors.image).first();
              const src =
                img.attr("src") ??
                img.attr("data-src") ??
                img.attr("data-lazy-src");
              if (src) image = absUrl(src, source.baseUrl);
            }
            yield {
              source: source.slug,
              externalId,
              externalUrl: detailUrl,
              title,
              description: title,
              rawPrice,
              rawType: source.slug,
              rawTransaction: txnDefault,
              rawAddress,
              rawSurface: null,
              rawRooms: null,
              imageUrls: image ? [image] : [],
            };
          }
        }
      }
    },
  };
}
