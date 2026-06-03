import { afterEach, describe, expect, it, vi } from "vitest";
import { buildEmbeddingInput, embed } from "@/lib/llm/embeddings";

describe("buildEmbeddingInput", () => {
  it("concatène titre, description et libellés d'équipements", () => {
    const text = buildEmbeddingInput({
      title: "Villa neuve",
      description: "Avec jardin",
      amenities: ["pool"],
    });
    expect(text).toContain("Villa neuve");
    expect(text).toContain("Avec jardin");
    expect(text.toLowerCase()).toContain("piscine");
  });
});

describe("embed", () => {
  const original = process.env.OPENAI_API_KEY;
  afterEach(() => {
    if (original === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = original;
    vi.restoreAllMocks();
  });
  it("renvoie null sans clé API", async () => {
    delete process.env.OPENAI_API_KEY;
    expect(await embed("test")).toBeNull();
  });
  it("renvoie null pour un texte vide", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    expect(await embed("   ")).toBeNull();
  });
});
