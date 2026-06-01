import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { scrapeSources } from "@/db/schema";
import { buildDynamicScraper } from "./dynamic";
import { coinAfriqueScraper } from "./sources/coinafrique";
import { facebookScraper } from "./sources/facebook";
import type { Scraper, ScraperSourceId } from "./types";

const staticScrapers: Scraper[] = [coinAfriqueScraper, facebookScraper];

export function listStaticScrapers(): Scraper[] {
  return staticScrapers;
}

async function loadDynamicScrapers(): Promise<Scraper[]> {
  const rows = await db.select().from(scrapeSources);
  return rows.map(buildDynamicScraper);
}

export async function loadAllScrapers(): Promise<Scraper[]> {
  const dyn = await loadDynamicScrapers();
  return [...staticScrapers, ...dyn];
}

export async function activeScrapers(): Promise<Scraper[]> {
  const all = await loadAllScrapers();
  return all.filter((s) => s.isEnabled());
}

export async function findScraper(
  id: ScraperSourceId,
): Promise<Scraper | undefined> {
  const fromStatic = staticScrapers.find((s) => s.id === id);
  if (fromStatic) return fromStatic;
  const row = await db
    .select()
    .from(scrapeSources)
    .where(eq(scrapeSources.slug, id))
    .limit(1);
  if (row.length === 0) return undefined;
  return buildDynamicScraper(row[0]);
}
