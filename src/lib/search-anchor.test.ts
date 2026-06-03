import { describe, expect, it } from "vitest";
import { extractFilters } from "@/lib/llm/extract-filters";
import { enrichSearchFilters, parseRadiusKm } from "./search-anchor";

describe("parseRadiusKm", () => {
  it("parses environ 5km", () => {
    expect(parseRadiusKm("environ 5km autour de galaxy")).toBe(5);
  });
});

describe("extractFilters radius (sans repère statique)", () => {
  it("extrait location maison 2 km sans nearLandmark", () => {
    const f = extractFilters(
      "je recherche à louer une maison qui se trouve environ 2km autour de la gare soarano",
    ).filters;
    expect(f.txn).toBe("rent");
    expect(f.propertyType).toBe("house");
    expect(f.radiusKm).toBe(2);
    expect(f.excludeTitleContains).toBe("villa");
    expect(f.nearLandmark).toBeUndefined();
  });

  it("extrait rayon 5 km sans nom de repère codé", () => {
    const f = extractFilters(
      "je recherche à louer une maison qui se trouve environ 5km autour de Galaxy andraharo",
    ).filters;
    expect(f.txn).toBe("rent");
    expect(f.radiusKm).toBe(5);
    expect(f.nearLandmark).toBeUndefined();
  });
});

describe("enrichSearchFilters", () => {
  it("ajoute le rayon depuis la requête", () => {
    const out = enrichSearchFilters(
      "location autour de Galaxy Andraharo 3 km",
      { txn: "rent" },
    );
    expect(out.radiusKm).toBe(3);
    expect(out.nearLandmark).toBeUndefined();
  });
});
