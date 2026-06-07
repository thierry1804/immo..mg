import crypto from "node:crypto";
import { redis } from "@/lib/redis";
import type { ChatMessage, ConversationalResult } from "./openai";

const TTL_SECONDS = 3600;
const PREFIX = "nlp:v1:";

export function nlpCacheKey(query: string, history: ChatMessage[]): string {
  const payload = JSON.stringify({
    q: query.trim().toLowerCase(),
    h: history.slice(-6),
  });
  return PREFIX + crypto.createHash("sha256").update(payload).digest("hex");
}

export async function getCachedNlp(
  query: string,
  history: ChatMessage[],
): Promise<ConversationalResult | null> {
  try {
    const raw = await redis.get(nlpCacheKey(query, history));
    return raw ? (JSON.parse(raw) as ConversationalResult) : null;
  } catch {
    return null;
  }
}

export async function setCachedNlp(
  query: string,
  history: ChatMessage[],
  result: ConversationalResult,
): Promise<void> {
  try {
    await redis.set(
      nlpCacheKey(query, history),
      JSON.stringify(result),
      "EX",
      TTL_SECONDS,
    );
  } catch {
    /* no-op : Redis indispo */
  }
}
