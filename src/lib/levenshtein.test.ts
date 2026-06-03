import { describe, expect, it } from "vitest";
import { levenshtein } from "@/lib/levenshtein";

describe("levenshtein", () => {
  it("vaut 0 pour deux chaînes identiques", () => {
    expect(levenshtein("analakely", "analakely")).toBe(0);
  });
  it("compte les substitutions", () => {
    expect(levenshtein("analakely", "analakerly")).toBe(1);
  });
  it("gère les chaînes vides", () => {
    expect(levenshtein("", "abc")).toBe(3);
  });
});
