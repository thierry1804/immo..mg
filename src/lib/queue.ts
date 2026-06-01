import { Queue } from "bullmq";
import { redisConnection } from "./redis";
import type { ScraperSourceId } from "@/scrapers/types";

export type ScrapeJobData = { sourceId: ScraperSourceId };

export const SCRAPE_QUEUE = "scrape";

export const scrapeQueue = new Queue<ScrapeJobData, void, string>(
  SCRAPE_QUEUE,
  { connection: redisConnection },
);

export async function enqueueScrape(sourceId: ScraperSourceId): Promise<void> {
  await scrapeQueue.add(
    `scrape:${sourceId}`,
    { sourceId },
    {
      removeOnComplete: { age: 3600, count: 50 },
      removeOnFail: { age: 24 * 3600 },
    },
  );
}
