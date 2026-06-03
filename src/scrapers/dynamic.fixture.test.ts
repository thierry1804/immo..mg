import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as cheerio from "cheerio";
import { describe, expect, it } from "vitest";

describe("dynamic scraper selectors", () => {
  it("parses a minimal card fixture", () => {
    const html = readFileSync(
      join(__dirname, "__fixtures__/sample-card.html"),
      "utf8",
    );
    const $ = cheerio.load(html);
    const card = $(".listing-card").first();
    expect(card.find("h2").text()).toContain("Villa");
    expect(card.find(".price").text()).toMatch(/Ar/);
  });
});
