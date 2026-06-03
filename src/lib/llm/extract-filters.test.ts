import { describe, expect, it } from "vitest";
import { extractFilters } from "./extract-filters";

describe("extractFilters", () => {
  it("detects rental transaction from louer/location", () => {
    expect(extractFilters("appartement à louer").filters.txn).toBe("rent");
    expect(extractFilters("location maison").filters.txn).toBe("rent");
  });

  it("detects sale transaction from acheter/vente/à vendre", () => {
    expect(extractFilters("maison à vendre").filters.txn).toBe("sale");
    expect(extractFilters("je veux acheter un terrain").filters.txn).toBe(
      "sale",
    );
  });

  it("maps property types", () => {
    expect(extractFilters("un appart").filters.propertyType).toBe("apartment");
    expect(extractFilters("belle maison").filters.propertyType).toBe("house");
    expect(extractFilters("terrain constructible").filters.propertyType).toBe(
      "land",
    );
    expect(extractFilters("local commercial").filters.propertyType).toBe(
      "commercial",
    );
  });

  it("parses a max budget with million/M multipliers", () => {
    expect(extractFilters("budget max 2 millions").filters.maxPrice).toBe(
      2_000_000,
    );
    expect(extractFilters("moins de 800k").filters.maxPrice).toBe(800_000);
    expect(extractFilters("jusqu'à 1,5M").filters.maxPrice).toBe(1_500_000);
  });

  it("parses a min budget from plus de / à partir de", () => {
    expect(extractFilters("à partir de 500 millions").filters.minPrice).toBe(
      500_000_000,
    );
  });

  it("parses a price range with entre X et Y", () => {
    const f = extractFilters("entre 1 et 2 millions").filters;
    expect(f.minPrice).toBe(1_000_000);
    expect(f.maxPrice).toBe(2_000_000);
  });

  it("parses minimum surface", () => {
    expect(extractFilters("au moins 120 m²").filters.minSurface).toBe(120);
    expect(extractFilters("plus de 80 m2").filters.minSurface).toBe(80);
  });

  it("parses minimum rooms", () => {
    expect(extractFilters("au moins 4 pièces").filters.minRooms).toBe(4);
    expect(extractFilters("3 chambres minimum").filters.minRooms).toBe(3);
  });

  it("resolves a fokontany by name", () => {
    expect(extractFilters("appartement à Ivandry").filters.fokontany).toBe(
      "Ivandry",
    );
  });

  it("parses radius km without fixing fokontany (géocodage ensuite)", () => {
    const f = extractFilters(
      "des locations dans la région d'ivato sur un rayon de 5km",
    ).filters;
    expect(f.txn).toBe("rent");
    expect(f.radiusKm).toBe(5);
    expect(f.fokontany).toBeUndefined();
  });

  it("extracts amenities", () => {
    const f = extractFilters("maison avec gardien et piscine").filters;
    expect(f.amenities).toEqual(expect.arrayContaining(["guard", "pool"]));
  });

  it("combines signals into one filter set and a human summary", () => {
    const r = extractFilters(
      "appartement à louer à Ivandry, budget max 2 millions, avec gardien",
    );
    expect(r.filters).toMatchObject({
      txn: "rent",
      propertyType: "apartment",
      fokontany: "Ivandry",
      maxPrice: 2_000_000,
    });
    expect(r.filters.amenities).toContain("guard");
    expect(r.summary.length).toBeGreaterThan(0);
  });

  it("returns an empty filter set for an unparseable query", () => {
    const r = extractFilters("bonjour ça va");
    expect(Object.keys(r.filters).filter((k) => k !== "amenities")).toHaveLength(
      0,
    );
  });
});
