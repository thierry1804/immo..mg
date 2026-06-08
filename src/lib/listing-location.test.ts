import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  buildPreciseGeocodeQuery,
  buildScopedQuery,
  decodeHtmlEntities,
  extractLocationPhrase,
  extractTitlePlace,
  resolveListingLocation,
} from "./listing-location";
import { matchLandmark } from "./landmarks";
import { matchFokontanyByName } from "./fokontany";

describe("extractTitlePlace", () => {
  it("extrait la ville après le suffixe de titre", () => {
    expect(extractTitlePlace("vente villas 6 pièces - toamasina")).toBe(
      "toamasina",
    );
  });
  it("extrait une ville + sous-zone", () => {
    expect(
      extractTitlePlace("vente villas 5 pièces - toamasina tetezambaro"),
    ).toBe("toamasina tetezambaro");
  });
  it("extrait un quartier de Tana", () => {
    expect(extractTitlePlace("Location villa -  Nanisana")).toBe("Nanisana");
  });
  it("ignore « Madagascar » seul", () => {
    expect(extractTitlePlace("Vente  villa - Madagascar")).toBeNull();
  });
  it("ignore « Antananarivo » seul", () => {
    expect(
      extractTitlePlace("Location villas 2 pièces - Antananarivo"),
    ).toBeNull();
  });
  it("ignore un titre sans suffixe", () => {
    expect(extractTitlePlace("Location annuelle")).toBeNull();
  });
  it("ignore un suffixe trop long (phrase descriptive OFIM)", () => {
    expect(
      extractTitlePlace(
        "Location Maison ANTANANARIVO - Madagascar - A LOUER - Coquette villa neuve située à Anjomakely Ivato",
      ),
    ).toBeNull();
  });
});

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

describe("buildScopedQuery", () => {
  it("scope une phrase de province sur sa ville, pas sur Antananarivo", () => {
    expect(buildScopedQuery("bord de mer", "Mahajanga")).toBe(
      "bord de mer, Mahajanga, Madagascar",
    );
  });
  it("scope sur Antananarivo par défaut", () => {
    expect(buildScopedQuery("Analakely", "Antananarivo")).toBe(
      "Analakely, Antananarivo, Madagascar",
    );
  });
  it("laisse passer une phrase déjà qualifiée Madagascar", () => {
    expect(buildScopedQuery("Toamasina, Madagascar", "Toamasina")).toBe(
      "Toamasina, Madagascar",
    );
  });
});

describe("resolveListingLocation (hors-réseau)", () => {
  beforeAll(() => {
    process.env.GEOCODE_SKIP_NETWORK = "true";
  });
  afterAll(() => {
    delete process.env.GEOCODE_SKIP_NETWORK;
  });

  it("place une annonce de province au centre de sa ville (plus jamais Tana)", async () => {
    const r = await resolveListingLocation({
      title: "Vente villa 4 pièces à Mahajanga",
      description: "Belle villa proche de la plage.",
      address: "Mahajanga",
    });
    expect(r).not.toBeNull();
    // Centre de Mahajanga (~ -15.7, 46.3), surtout pas Antananarivo (~ -18.9).
    expect(r!.lat).toBeGreaterThan(-16);
    expect(r!.lat).toBeLessThan(-15.4);
    expect(r!.lng).toBeGreaterThan(46);
    expect(r!.lng).toBeLessThan(46.6);
    expect(r!.confidence).toBeLessThanOrEqual(55);
    expect(r!.source).toMatch(/ville/i);
  });

  it("émet une confiance élevée pour un repère nommé", async () => {
    const r = await resolveListingLocation({
      title:
        "Vente Maison à Antanetibe Ivato près de PAON D'OR",
      description: "",
      address: "Antananarivo",
    });
    expect(r).not.toBeNull();
    expect(r!.confidence).toBeGreaterThanOrEqual(90);
    expect(r!.fokontany).toBe("Antanetibe");
  });

  it("retombe sur le quartier de Tana avec une confiance moyenne", async () => {
    const r = await resolveListingLocation({
      title: "Appartement T3 à Andrefan'ambohijanahary",
      description: "",
      address: "Antananarivo",
    });
    expect(r).not.toBeNull();
    expect(r!.fokontany).toBe("Andrefan'ambohijanahary");
    expect(r!.confidence).toBeGreaterThan(40);
    expect(r!.confidence).toBeLessThan(90);
  });

  it("renvoie null pour une annonce Tana non localisable", async () => {
    const r = await resolveListingLocation({
      title: "Belle opportunité à saisir",
      description: "Bien rare, contactez-nous.",
      address: "Antananarivo",
    });
    expect(r).toBeNull();
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
