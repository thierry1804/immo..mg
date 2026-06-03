import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseEtranoListPage } from "./etrano";

describe("etrano list parser", () => {
  it("parses listing card fixture", () => {
    const html = readFileSync(
      join(__dirname, "../__fixtures__/etrano-card-snippet.html"),
      "utf8",
    );
    const cards = parseEtranoListPage(html);
    expect(cards).toHaveLength(1);
    expect(cards[0].externalId).toBe("1234");
    expect(cards[0].rawPrice).toContain("2500000");
    expect(cards[0].rawAddress).toMatch(/Ivandry/i);
  });

  it("skips prix sur demande", () => {
    const html = `<div class="card_anc-1"><a href="/annonce/1"><h3><strong>Prix sur demande</strong></h3><p class="mt-1"><strong>T3</strong></p><p class="mt-0">Antananarivo</p></a></div>`;
    expect(parseEtranoListPage(html)).toHaveLength(0);
  });
});
