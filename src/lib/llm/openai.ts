/**
 * Conversational search: turn a free-text French query into structured filters.
 * Uses OpenAI gpt-4o-mini with a strict json_schema when OPENAI_API_KEY is set;
 * otherwise (or on any error) falls back to the pure rule-based extractor. No
 * SDK dependency — the REST endpoint is called directly via fetch.
 */
import { z } from "zod";
import { AMENITIES } from "@/lib/amenities";
import { FOKONTANY } from "@/lib/fokontany";
import {
  extractFilters,
  summarize,
  type SearchFilters,
} from "./extract-filters";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type ConversationalResult = {
  filters: SearchFilters;
  summary: string;
  /** A follow-up question when the query is too vague to act on. */
  clarification?: string;
  source: "openai" | "fallback";
};

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o-mini";

const filtersSchema = z
  .object({
    txn: z.enum(["sale", "rent"]).nullish(),
    propertyType: z
      .enum(["house", "apartment", "land", "commercial", "other"])
      .nullish(),
    minPrice: z.number().int().positive().nullish(),
    maxPrice: z.number().int().positive().nullish(),
    minSurface: z.number().int().positive().nullish(),
    minRooms: z.number().int().nonnegative().nullish(),
    fokontany: z.string().nullish(),
    amenities: z.array(z.enum(AMENITIES)).nullish(),
  })
  .strip();

const responseSchema = z.object({
  filters: filtersSchema,
  clarification: z.string().nullish(),
  summary: z.string().nullish(),
});

/** Drop null/undefined keys so the result is a clean SearchFilters. */
function clean(raw: z.infer<typeof filtersSchema>): SearchFilters {
  const out: SearchFilters = {};
  if (raw.txn) out.txn = raw.txn;
  if (raw.propertyType) out.propertyType = raw.propertyType;
  if (raw.minPrice != null) out.minPrice = raw.minPrice;
  if (raw.maxPrice != null) out.maxPrice = raw.maxPrice;
  if (raw.minSurface != null) out.minSurface = raw.minSurface;
  if (raw.minRooms != null) out.minRooms = raw.minRooms;
  if (raw.fokontany) out.fokontany = raw.fokontany;
  if (raw.amenities?.length) out.amenities = raw.amenities;
  return out;
}

const JSON_SCHEMA = {
  name: "property_search",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["filters", "clarification", "summary"],
    properties: {
      filters: {
        type: "object",
        additionalProperties: false,
        required: [
          "txn",
          "propertyType",
          "minPrice",
          "maxPrice",
          "minSurface",
          "minRooms",
          "fokontany",
          "amenities",
        ],
        properties: {
          txn: { type: ["string", "null"], enum: ["sale", "rent", null] },
          propertyType: {
            type: ["string", "null"],
            enum: ["house", "apartment", "land", "commercial", "other", null],
          },
          minPrice: { type: ["integer", "null"] },
          maxPrice: { type: ["integer", "null"] },
          minSurface: { type: ["integer", "null"] },
          minRooms: { type: ["integer", "null"] },
          fokontany: { type: ["string", "null"] },
          amenities: {
            type: ["array", "null"],
            items: { type: "string", enum: [...AMENITIES] },
          },
        },
      },
      clarification: { type: ["string", "null"] },
      summary: { type: ["string", "null"] },
    },
  },
} as const;

function systemPrompt(): string {
  return [
    "Tu es l'assistant de recherche d'immo·mg, un agrégateur immobilier premium pour Antananarivo (Madagascar).",
    "À partir du message de l'utilisateur, extrais des filtres de recherche structurés.",
    "Les prix sont en Ariary (Ar). Convertis « millions »/« M » (×1 000 000) et « k » (×1 000) en entiers.",
    `Quartiers (fokontany) reconnus : ${FOKONTANY.map((f) => f.name).join(", ")}. N'utilise que ces noms, sinon laisse null.`,
    `Équipements possibles (clés exactes) : ${AMENITIES.join(", ")}.`,
    "txn = rent pour louer/location, sale pour acheter/vente.",
    "Si la demande est trop vague pour filtrer, mets une question courte dans clarification. Sinon clarification = null.",
    "summary : une phrase en français résumant la recherche comprise.",
    "Mets null pour tout champ non mentionné.",
  ].join(" ");
}

export function hasOpenAI(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function conversationalSearch(
  query: string,
  history: ChatMessage[] = [],
): Promise<ConversationalResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return fallback(query);

  try {
    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0,
        messages: [
          { role: "system", content: systemPrompt() },
          ...history.slice(-6),
          { role: "user", content: query },
        ],
        response_format: { type: "json_schema", json_schema: JSON_SCHEMA },
      }),
      // Don't let a slow model hang the request.
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return fallback(query);

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return fallback(query);

    const parsed = responseSchema.safeParse(JSON.parse(content));
    if (!parsed.success) return fallback(query);

    const filters = clean(parsed.data.filters);
    return {
      filters,
      summary: parsed.data.summary || summarize(filters),
      clarification: parsed.data.clarification ?? undefined,
      source: "openai",
    };
  } catch {
    return fallback(query);
  }
}

function fallback(query: string): ConversationalResult {
  const { filters, summary } = extractFilters(query);
  const empty = Object.keys(filters).length === 0;
  return {
    filters,
    summary,
    clarification: empty
      ? "Pouvez-vous préciser le type de bien, le quartier ou votre budget ?"
      : undefined,
    source: "fallback",
  };
}
