import { describe, expect, it } from "vitest";
import {
  buildPreciseGeocodeQuery,
  decodeHtmlEntities,
  extractLocationPhrase,
} from "./listing-location";
import { matchLandmark } from "./landmarks";
import { matchFokontanyByName } from "./fokontany";

describe("decodeHtmlEntities", () => {
  it("decodes apostrophe entities from OFIM titles", () => {
    expect(decodeHtmlEntities("Andrefan&#39;ambohijanahary")).toBe(
      "Andrefan'ambohijanahary",
    );
  });
});

describe("extractLocationPhrase", () => {
  it("extracts neighborhood from OFIM-style title", () => {
    expect(
      extractLocationPhrase(
        "Location d'un Appartement T3 à Andrefan'ambohijanahary Antananarivo",
      ),
    ).toBe("Andrefan'ambohijanahary");
  });

  it("extracts Ivato area from title", () => {
    expect(
      extractLocationPhrase(
        "Location d'un appartement T3 à Antanetibe Ivato près de PAON D'OR",
      ),
    ).toMatch(/Antanetibe Ivato/i);
  });
});

describe("Paon d'Or listing", () => {
  const title =
    "Vente Maison / Villa - A VENDRE - Une propriété à Antanetibe Ivato près de PAON D'OR";

  it("detects Paon d'Or landmark", () => {
    expect(matchLandmark(title)?.name).toBe("Paon d'Or");
  });

  it("builds geocode query around the landmark", () => {
    expect(buildPreciseGeocodeQuery(title, null, null)).toContain("Paon d'Or");
  });
});

describe("matchFokontanyByName (longest match)", () => {
  it("prefers Andrefan'ambohijanahary over shorter names", () => {
    expect(
      matchFokontanyByName(
        "appartement à Andrefan'ambohijanahary Antananarivo",
      ),
    ).toBe("Andrefan'ambohijanahary");
  });

  it("matches Anjomakely in compound place names", () => {
    expect(matchFokontanyByName("située à Anjomakely Ivato")).toBe("Anjomakely");
  });
});
