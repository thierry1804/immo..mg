import type { RawListing, Scraper } from "../types";

// EXPERIMENTAL — disabled by default.
//
// Scraping Facebook (Marketplace / public groups) violates Meta's Terms of
// Service and triggers anti-bot defenses (login walls, IP bans, account
// suspension). Only run this for personal R&D and with eyes open.
//
// Activation steps if you really want it:
//   npm i playwright
//   npx playwright install chromium
//   set FB_SCRAPER_ENABLED=true, FB_USERNAME, FB_PASSWORD in .env.local
//
// The implementation below is a *skeleton* — it dynamic-imports playwright
// only when enabled so the dependency stays optional. Selectors must be
// adapted; Facebook obfuscates and changes them frequently.

export const facebookScraper: Scraper = {
  id: "facebook",
  isEnabled() {
    return process.env.FB_SCRAPER_ENABLED === "true";
  },
  async *fetchListings(): AsyncIterable<RawListing> {
    if (!this.isEnabled()) return;
    const username = process.env.FB_USERNAME;
    const password = process.env.FB_PASSWORD;
    if (!username || !password) {
      console.warn(
        "[facebook] FB_USERNAME / FB_PASSWORD missing; skipping run.",
      );
      return;
    }

    // Lazy load playwright so it's not a required dependency when disabled.
    let playwright;
    try {
      playwright = await import(
        /* @vite-ignore */ "playwright" as unknown as string
      );
    } catch {
      console.error(
        "[facebook] playwright not installed. Run: npm i playwright && npx playwright install chromium",
      );
      return;
    }

    const browser = await playwright.chromium.launch({ headless: true });
    try {
      const ctx = await browser.newContext({
        userAgent:
          process.env.SCRAPER_USER_AGENT ??
          "Mozilla/5.0 (X11; Linux x86_64) GeoMarketBot/0.1",
      });
      const page = await ctx.newPage();
      // TODO: implement login + marketplace search for Madagascar.
      // This block is intentionally left as a stub.
      await page.goto("https://www.facebook.com/login", { timeout: 30000 });
      console.warn(
        "[facebook] login + marketplace scraping not implemented yet.",
      );
    } finally {
      await browser.close();
    }
    // No yields yet.
  },
};
