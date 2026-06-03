import { Worker } from "bullmq";
import { redis, redisConnection } from "@/lib/redis";
import { SCRAPE_QUEUE, scrapeQueue } from "@/lib/queue";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { scrapeSources } from "@/db/schema";
import { normalizeListing } from "@/scrapers/normalize";
import { activeScrapers, findScraper } from "@/scrapers/registry";
import { upsertScrapedListing } from "@/scrapers/upsert";
import type { ScrapeJobData } from "@/lib/queue";

async function processScrape(sourceId: string) {
  const scraper = await findScraper(sourceId);
  if (!scraper) {
    console.warn(`[worker] unknown source ${sourceId}`);
    return { inserted: 0, updated: 0, unchanged: 0, dropped: 0 };
  }
  if (!scraper.isEnabled()) {
    console.log(`[worker] ${sourceId} disabled, skipping`);
    return { inserted: 0, updated: 0, unchanged: 0, dropped: 0 };
  }
  console.log(`[worker] ${sourceId} starting`);
  const stats = { inserted: 0, updated: 0, unchanged: 0, dropped: 0, errors: 0 };
  for await (const raw of scraper.fetchListings()) {
    try {
      const normalized = await normalizeListing(raw);
      if (!normalized) {
        stats.dropped++;
        continue;
      }
      const outcome = await upsertScrapedListing(normalized);
      stats[outcome]++;
    } catch (err) {
      stats.errors++;
      console.error(
        `[worker] ${sourceId} item ${raw.externalId} failed:`,
        err instanceof Error ? err.message : err,
      );
    }
  }
  console.log(`[worker] ${sourceId} done`, stats);
  await db
    .update(scrapeSources)
    .set({ lastRunAt: new Date(), lastRunStats: stats })
    .where(eq(scrapeSources.slug, sourceId));
  return stats;
}

async function registerRepeatables() {
  const hours = Number(process.env.SCRAPE_INTERVAL_HOURS ?? "6");
  const every = Math.max(1, hours) * 60 * 60 * 1000;
  const active = await activeScrapers();
  for (const s of active) {
    await scrapeQueue.add(
      `scrape:${s.id}`,
      { sourceId: s.id },
      {
        repeat: { every },
        jobId: `repeat:${s.id}`,
        removeOnComplete: { age: 3600, count: 50 },
        removeOnFail: { age: 24 * 3600 },
      },
    );
    console.log(
      `[worker] registered repeatable for ${s.id} every ${hours}h`,
    );
  }
}

async function main() {
  console.log("[worker] booting");
  const active = await activeScrapers();
  console.log(
    `[worker] active scrapers: ${
      active.map((s) => s.id).join(", ") || "(none)"
    }`,
  );
  await registerRepeatables();

  const worker = new Worker<ScrapeJobData, void, string>(
    SCRAPE_QUEUE,
    async (job) => {
      await processScrape(job.data.sourceId);
    },
    { connection: redisConnection, concurrency: 1 },
  );

  worker.on("failed", (job, err) => {
    console.error(`[worker] job ${job?.id} failed:`, err.message);
  });

  const shutdown = async () => {
    console.log("[worker] shutting down");
    await worker.close();
    await scrapeQueue.close();
    await redis.quit();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("[worker] fatal:", err);
  process.exit(1);
});
