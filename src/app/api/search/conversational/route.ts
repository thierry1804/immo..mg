import { NextResponse } from "next/server";
import { z } from "zod";
import { conversationalSearch } from "@/lib/llm/openai";
import { summarize } from "@/lib/llm/extract-filters";
import { enforceRateLimit } from "@/lib/rate-limit";
import { resolveSearchPlace } from "@/lib/resolve-search-place";
import { searchPreview } from "@/lib/search-preview";

const bodySchema = z.object({
  query: z.string().min(1).max(500),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(2000),
      }),
    )
    .max(20)
    .optional(),
});

export async function POST(req: Request) {
  const limited = await enforceRateLimit(req, "conversational", 30, 60);
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const raw = await conversationalSearch(
    parsed.data.query,
    parsed.data.history ?? [],
  );
  const filters =
    Object.keys(raw.filters).length > 0
      ? await resolveSearchPlace(parsed.data.query, raw.filters)
      : raw.filters;
  const result = {
    ...raw,
    filters,
    summary:
      Object.keys(filters).length > 0 ? summarize(filters) : raw.summary,
  };
  const preview =
    Object.keys(result.filters).length > 0
      ? await searchPreview(result.filters, 3)
      : { total: 0, listings: [], medianHint: null };

  return NextResponse.json({ ...result, preview });
}
