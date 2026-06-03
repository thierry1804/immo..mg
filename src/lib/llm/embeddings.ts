import { AMENITY_LABELS, type Amenity } from "@/lib/amenities";

const EMBEDDINGS_URL = "https://api.openai.com/v1/embeddings";
export const EMBEDDING_MODEL = "text-embedding-3-small";

export function buildEmbeddingInput(l: {
  title: string;
  description: string;
  amenities: Amenity[] | string[];
}): string {
  const labels = (l.amenities as string[])
    .map((a) => AMENITY_LABELS[a as Amenity] ?? a)
    .join(", ");
  return [l.title, l.description, labels].filter(Boolean).join("\n");
}

/** Construit les colonnes embedding pour un insert/update (best-effort). */
export async function embeddingColumns(l: {
  title: string;
  description: string;
  amenities: Amenity[] | string[];
}): Promise<
  { embedding: number[]; embeddingModel: string } | Record<string, never>
> {
  const vec = await embed(buildEmbeddingInput(l));
  return vec ? { embedding: vec, embeddingModel: EMBEDDING_MODEL } : {};
}

/** Embedding OpenAI. Renvoie null sans clé ou sur erreur (dégradation propre). */
export async function embed(text: string): Promise<number[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  const input = text.trim();
  if (!apiKey || !input) return null;
  try {
    const res = await fetch(EMBEDDINGS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      data?: { embedding?: number[] }[];
    };
    return data.data?.[0]?.embedding ?? null;
  } catch {
    return null;
  }
}
