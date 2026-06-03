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
});
