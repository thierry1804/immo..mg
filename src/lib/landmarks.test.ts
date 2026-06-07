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
});

describe("isNearIvatoAirport", () => {
  it("detects runway coordinates", () => {
    expect(isNearIvatoAirport(47.4789, -18.7969)).toBe(true);
  });

  it("excludes Paon d'Or area", () => {
    expect(isNearIvatoAirport(47.4697, -18.8353)).toBe(false);
  });
});
