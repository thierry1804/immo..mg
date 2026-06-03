import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  extractFirstAriaryPrice,
  extractOfimId,
  parseOfimRssItem,
} from "./ofim";

describe("ofim RSS parser", () => {
  it("extracts listing id from URL", () => {
    expect(
      extractOfimId(
        "https://www.ofim.mg/72954/Location-Maison-Villa.html",
      ),
    ).toBe("72954");
  });

  it("extracts Ariary price from text", () => {
    expect(extractFirstAriaryPrice("Loyers : 7 680 000 ar")).toBe("7680000");
  });

  it("parses fixture item", () => {
    const xml = readFileSync(
      join(__dirname, "../__fixtures__/ofim-item.xml"),
      "utf8",
    );
    const item = parseOfimRssItem(xml);
    expect(item).not.toBeNull();
    expect(item?.externalId).toBe("72954");
    expect(item?.rawPrice).toContain("7680000");
    expect(item?.rawAddress).toMatch(/ANTANANARIVO/i);
    expect(item?.imageUrls[0]).toContain("ofim.mg");
  });
});
