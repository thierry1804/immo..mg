import { describe, expect, it } from "vitest";
import { parseFilters, toParams, hasActiveFilters } from "@/lib/search-filters";

describe("filtre q (texte libre)", () => {
  it("se parse depuis les params", () => {
    const f = parseFilters((k) => (k === "q" ? "maison lumineuse" : null));
    expect(f.q).toBe("maison lumineuse");
  });
  it("se sérialise", () => {
    expect(toParams({ q: "maison lumineuse" }).get("q")).toBe("maison lumineuse");
  });
  it("q seul rend les filtres actifs", () => {
    expect(hasActiveFilters({ q: "maison" })).toBe(true);
  });
});
