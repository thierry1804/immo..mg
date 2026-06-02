import { describe, expect, it } from "vitest";
import { AMENITIES, AMENITY_LABELS, extractAmenities } from "./amenities";

describe("AMENITIES", () => {
  it("has a French label for every key", () => {
    for (const a of AMENITIES) {
      expect(AMENITY_LABELS[a]).toBeTruthy();
    }
  });
});

describe("extractAmenities", () => {
  it("detects a guard", () => {
    expect(extractAmenities("Villa avec gardien 24h")).toContain("guard");
  });

  it("detects a backup generator", () => {
    expect(extractAmenities("équipée d'un groupe électrogène")).toContain(
      "generator",
    );
  });

  it("detects a water cistern", () => {
    expect(extractAmenities("citerne d'eau et forage")).toContain("cistern");
  });

  it("detects covered parking", () => {
    expect(extractAmenities("parking couvert pour 2 voitures")).toContain(
      "parking",
    );
  });

  it("detects a gated/secured residence", () => {
    expect(extractAmenities("résidence fermée et sécurisée")).toContain(
      "gated",
    );
  });

  it("detects paved access", () => {
    expect(extractAmenities("accès bitumé jusqu'au portail")).toContain(
      "paved",
    );
  });

  it("detects air conditioning", () => {
    expect(extractAmenities("chambres climatisées")).toContain("ac");
  });

  it("detects fiber internet", () => {
    expect(extractAmenities("internet par fibre optique")).toContain("fiber");
  });

  it("detects a pool", () => {
    expect(extractAmenities("grande piscine chauffée")).toContain("pool");
  });

  it("returns a deduplicated, stable-ordered list", () => {
    const result = extractAmenities("gardien, gardiennage, piscine, piscine");
    expect(result).toEqual(["guard", "pool"]);
  });

  it("returns an empty array when nothing matches", () => {
    expect(extractAmenities("joli appartement lumineux")).toEqual([]);
  });

  it("is accent and case insensitive", () => {
    expect(extractAmenities("GROUPE ELECTROGENE")).toContain("generator");
  });
});
