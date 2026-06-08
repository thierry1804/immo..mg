import { describe, expect, it } from "vitest";
import { buildNominatimUrl } from "@/scrapers/geocode";

describe("buildNominatimUrl", () => {
  it("applique le viewbox + bounded quand biais demandé", () => {
    const url = buildNominatimUrl("gare soarano", { biasTana: true });
    expect(url.searchParams.get("bounded")).toBe("1");
    expect(url.searchParams.get("viewbox")).toMatch(/47\./);
    expect(url.searchParams.get("countrycodes")).toBe("mg");
  });
  it("sans biais : pas de viewbox", () => {
    const url = buildNominatimUrl("antsirabe", {});
    expect(url.searchParams.get("viewbox")).toBeNull();
  });

  it("applique un viewbox arbitraire (biais ville de province)", () => {
    const url = buildNominatimUrl("bord de mer", {
      viewbox: "46.20,-15.83,46.44,-15.59",
    });
    expect(url.searchParams.get("viewbox")).toBe("46.20,-15.83,46.44,-15.59");
    expect(url.searchParams.get("bounded")).toBe("1");
  });
});
