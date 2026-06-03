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
    );
  });
});

describe("resolveSearchPlace", () => {
  beforeEach(() => {
    vi.mocked(geocode).mockReset();
  });

  it("remplit nearLng/nearLat et nearLabel via géocodeur", async () => {
    vi.mocked(geocode).mockResolvedValueOnce({ lng: 47.521, lat: -18.903 });
    const out = await resolveSearchPlace(
      "maison 2km autour de la gare soarano",
      { txn: "rent", radiusKm: 2, propertyType: "house" },
    );
    expect(out.nearLabel).toMatch(/gare soarano/i);
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
