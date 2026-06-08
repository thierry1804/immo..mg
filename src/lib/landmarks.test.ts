import { describe, expect, it } from "vitest";
import {
  extractProximityTarget,
  isNearIvatoAirport,
  matchLandmark,
} from "./landmarks";

describe("matchLandmark", () => {
  it("matches Paon d'Or in OFIM title", () => {
    expect(
      matchLandmark(
        "à Antanetibe Ivato près de PAON D'OR",
      )?.name,
    ).toBe("Paon d'Or");
  });

  it("matches Gare Soarano", () => {
    expect(matchLandmark("gare soarano")?.name).toBe("Gare Soarano");
    expect(matchLandmark("2 km autour de la gare de soarano")?.name).toBe(
      "Gare Soarano",
    );
  });
});

describe("extractProximityTarget", () => {
  it("extracts landmark after près de", () => {
    expect(
      extractProximityTarget(
        "2 maisons à rénover à Antanetibe Ivato près de PAON D'OR",
      ),
    ).toMatch(/PAON D'OR/i);
  });

  it("extrait la cible après « à N min de »", () => {
    expect(
      extractProximityTarget("Villa à 5 min de l'école Saint-Michel"),
    ).toMatch(/école Saint-Michel/i);
  });

  it("extrait après « à N minutes en voiture de »", () => {
    expect(
      extractProximityTarget("Maison à 10 minutes en voiture de la gare"),
    ).toMatch(/^gare$/i);
  });

  it("extrait après « à N km de »", () => {
    expect(
      extractProximityTarget("Terrain à 2 km du lycée français"),
    ).toMatch(/lycée français/i);
  });

  it("extrait après « en face de »", () => {
    expect(
      extractProximityTarget("Studio en face de l'université d'Ankatso"),
    ).toMatch(/université d'Ankatso/i);
  });

  it("extrait après « non loin de »", () => {
    expect(
      extractProximityTarget("Appartement non loin du marché central"),
    ).toMatch(/marché central/i);
  });

  it("extrait après « derrière »", () => {
    expect(
      extractProximityTarget("Maison derrière le stade municipal"),
    ).toMatch(/stade municipal/i);
  });

  it("retire l'article de tête (« de la gare » → « gare »)", () => {
    expect(extractProximityTarget("à côté de la gare")).toBe("gare");
  });
});

describe("isNearIvatoAirport", () => {
  it("detects runway coordinates", () => {
    expect(isNearIvatoAirport(47.4789, -18.7969)).toBe(true);
  });

  it("excludes Paon d'Or area", () => {
    expect(isNearIvatoAirport(47.4697, -18.8353)).toBe(false);
  });
});
