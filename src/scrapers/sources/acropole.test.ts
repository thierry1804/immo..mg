import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { eurPriceToAriaryString, parseAcropoleListPage } from "./acropole";

describe("acropole list parser", () => {
  it("converts EUR monthly price to Ariary string", () => {
    expect(eurPriceToAriaryString("860 €/mois")).toBe("4128000 Ar");
  });

  it("parses listing card fixture", () => {
    const html = readFileSync(
      join(__dirname, "../__fixtures__/acropole-list-snippet.html"),
      "utf8",
    );
    const cards = parseAcropoleListPage(html);
    expect(cards).toHaveLength(1);
    expect(cards[0].externalId).toBe("7733220");
    expect(cards[0].rawPrice).toMatch(/4128000/);
    expect(cards[0].rawRooms).toBe("2");
    expect(cards[0].rawSurface).toContain("65");
  });
});
