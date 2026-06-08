import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/scrapers/geocode", () => ({
  geocode: vi.fn(),
}));

import { geocode } from "@/scrapers/geocode";
import {
  extractPlacePhrase,
  geocodePlace,
  resolveSearchPlace,
} from "./resolve-search-place";

describe("extractPlacePhrase", () => {
  it("extrait le lieu après « autour de »", () => {
    expect(
      extractPlacePhrase(
        "maison à louer environ 2km autour de la gare soarano",
      ),
    ).toMatch(/gare soarano/i);
  });

  it("extrait Galaxy andraharo", () => {
    expect(
      extractPlacePhrase(
        "maison à louer environ 5km autour de Galaxy andraharo",
      ),
    ).toMatch(/galaxy andraharo/i);
  });

  it("isole le lieu après « rayon de Nkm de … »", () => {
    expect(
      extractPlacePhrase("maison à louer dans 1 rayon de 2km de sodiama"),
    ).toBe("sodiama");
  });

  it("isole le lieu après « dans un rayon de Nkm de … »", () => {
    expect(
      extractPlacePhrase("maison à louer dans un rayon de 2km de sodiama"),
    ).toBe("sodiama");
  });

  it("isole le lieu après « à Nkm de … »", () => {
    expect(extractPlacePhrase("appartement à 3 km de Ankorondrano")).toBe(
      "Ankorondrano",
    );
  });

  it("ignore la queue de phrase après le lieu", () => {
    expect(
      extractPlacePhrase("maison dans un rayon de 2km de sodiama avec piscine"),
    ).toBe("sodiama");
  });
});

describe("geocodePlace", () => {
  beforeEach(() => {
    vi.mocked(geocode).mockReset();
  });

  it("suffixe Antananarivo pour Nominatim", async () => {
    vi.mocked(geocode).mockResolvedValueOnce({ lng: 47.52, lat: -18.9 });
    await geocodePlace("gare Soarano");
    expect(geocode).toHaveBeenCalledWith(
      "gare Soarano, Antananarivo, Madagascar",
      { biasTana: true },
    );
  });

  it("retire l'article de tête (« la primature » → « primature »)", async () => {
    vi.mocked(geocode).mockResolvedValueOnce({ lng: 47.546, lat: -18.944 });
    await geocodePlace("la primature");
    expect(geocode).toHaveBeenCalledWith(
      "primature, Antananarivo, Madagascar",
      { biasTana: true },
    );
  });
});

describe("resolveSearchPlace", () => {
  beforeEach(() => {
    vi.mocked(geocode).mockReset();
  });

  it("utilise le repère codé Gare Soarano sans appeler Nominatim", async () => {
    const out = await resolveSearchPlace(
      "maison 2km autour de la gare soarano",
      { txn: "rent", radiusKm: 2, propertyType: "house" },
    );
    expect(out.nearLabel).toBe("Gare Soarano");
    expect(out.nearLng).toBeCloseTo(47.521, 2);
    expect(out.nearLat).toBeCloseTo(-18.903, 2);
    expect(geocode).not.toHaveBeenCalled();
  });

  it("remplit nearLng/nearLat via géocodeur pour un lieu hors repères", async () => {
    vi.mocked(geocode).mockResolvedValueOnce({ lng: 47.521, lat: -18.903 });
    const out = await resolveSearchPlace(
      "maison 2km autour de Galaxy andraharo",
      { txn: "rent", radiusKm: 2, propertyType: "house" },
    );
    expect(out.nearLabel).toMatch(/galaxy andraharo/i);
    expect(out.nearLng).toBeCloseTo(47.521, 2);
    expect(out.nearLat).toBeCloseTo(-18.903, 2);
    expect(out.fokontany).toBeUndefined();
    expect(out.nearLandmark).toBeUndefined();
  });

  it("ne modifie pas sans rayon", async () => {
    const f = { txn: "rent" as const, fokontany: "Ivandry" };
    const out = await resolveSearchPlace("location Ivandry", f);
    expect(out).toEqual(f);
    expect(geocode).not.toHaveBeenCalled();
  });
});
