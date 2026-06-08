import { describe, expect, it } from "vitest";
import { cityViewbox, isBareCityName, matchCityMg } from "./places-mg";

describe("matchCityMg", () => {
  it("détecte une ville de province citée dans le texte", () => {
    expect(matchCityMg("Belle villa à Mahajanga bord de mer")?.name).toBe(
      "Mahajanga",
    );
  });

  it("reconnaît un alias historique (Tamatave → Toamasina)", () => {
    expect(matchCityMg("Maison à louer Tamatave centre")?.name).toBe(
      "Toamasina",
    );
  });

  it("préfère la correspondance la plus longue (Nosy Be, pas une sous-chaîne)", () => {
    expect(matchCityMg("Bungalow à Nosy Be Andoany")?.name).toBe("Nosy Be");
  });

  it("connaît aussi Antananarivo (gazetteer complet)", () => {
    expect(matchCityMg("Appartement à Antananarivo")?.name).toBe(
      "Antananarivo",
    );
  });

  it("ne matche pas sur une sous-chaîne accidentelle", () => {
    // « here » ne doit pas déclencher une ville ; aucune ville connue ici.
    expect(matchCityMg("villa moderne avec piscine chauffée")).toBeNull();
  });

  it("est insensible à la casse et aux accents", () => {
    expect(matchCityMg("LOCATION TOLIARA")?.name).toBe("Toliara");
    expect(matchCityMg("vente terrain antsirabe")?.name).toBe("Antsirabe");
  });
});

describe("isBareCityName", () => {
  it("reconnaît un nom de ville seul", () => {
    expect(isBareCityName("Toamasina")).toBe(true);
    expect(isBareCityName("tamatave")).toBe(true);
  });
  it("rejette ville + sous-zone (plus précis qu'une ville)", () => {
    expect(isBareCityName("Toamasina Tetezambaro")).toBe(false);
  });
  it("rejette un lieu qui n'est pas une ville connue", () => {
    expect(isBareCityName("Isoraka")).toBe(false);
  });
});

describe("cityViewbox", () => {
  it("renvoie une viewbox Nominatim lon,lat,lon,lat autour du centre", () => {
    const city = matchCityMg("Mahajanga")!;
    const vb = cityViewbox(city);
    const parts = vb.split(",").map(Number);
    expect(parts).toHaveLength(4);
    // min lon < centre < max lon ; min lat < centre < max lat
    expect(parts[0]).toBeLessThan(city.lng);
    expect(parts[2]).toBeGreaterThan(city.lng);
    expect(parts[1]).toBeLessThan(city.lat);
    expect(parts[3]).toBeGreaterThan(city.lat);
  });
});
