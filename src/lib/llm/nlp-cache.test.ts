import { describe, expect, it } from "vitest";
import { nlpCacheKey } from "@/lib/llm/nlp-cache";

describe("nlpCacheKey", () => {
  it("est stable pour mêmes entrées", () => {
    const h = [{ role: "user" as const, content: "salut" }];
    expect(nlpCacheKey("maison", h)).toBe(nlpCacheKey("maison", h));
  });
  it("diffère quand la requête change", () => {
    expect(nlpCacheKey("maison", [])).not.toBe(nlpCacheKey("villa", []));
  });
});
