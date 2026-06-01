import { redis } from "@/lib/redis";
import { enqueueScrape, scrapeQueue } from "@/lib/queue";
import { activeScrapers, loadAllScrapers } from "@/scrapers/registry";

async function main() {
  const arg = process.argv[2];
  const known = (await loadAllScrapers()).map((s) => s.id);
  const targets: string[] = arg
    ? [arg]
    : (await activeScrapers()).map((s) => s.id);

  if (arg && !known.includes(arg)) {
    console.error(`Unknown source "${arg}". Known: ${known.join(", ") || "(none)"}`);
    process.exit(2);
  }

  for (const id of targets) {
    await enqueueScrape(id);
    console.log(`enqueued: ${id}`);
  }

  await scrapeQueue.close();
  await redis.quit();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
