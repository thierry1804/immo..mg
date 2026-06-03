import { describe, expect, it } from "vitest";
import { normalizeTextQuery } from "@/lib/listing-text-search";

describe("normalizeTextQuery", () => {
  it("renvoie null pour du vide ou trop court", () => {
    expect(normalizeTextQuery("  ")).toBeNull();
    expect(normalizeTextQuery("a")).toBeNull();
  });
  it("nettoie et conserve un texte utile", () => {
    expect(normalizeTextQuery("  appartement lumineux  ")).toBe(
      "appartement lumineux",
    );
  });
});
