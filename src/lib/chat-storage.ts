import type { SearchFilters } from "@/lib/search-filters";
import type { PreviewListing } from "@/lib/search-preview";

const STORAGE_KEY = "geomarket-chat-v1";

export type ChatTurn = { role: "user" | "assistant"; content: string };

export type ChatLastResult = {
  filters: SearchFilters;
  summary: string;
  preview?: {
    total: number;
    listings: PreviewListing[];
    medianHint: string | null;
  };
};

export type ChatPersisted = {
  turns: ChatTurn[];
  apiHistory: ChatTurn[];
  lastResult: ChatLastResult | null;
};

export const CHAT_GREETING =
  "Bonjour 👋 Décrivez le bien que vous cherchez — type, quartier, budget, équipements — et je prépare la recherche.";

export function defaultChatState(): ChatPersisted {
  return {
    turns: [{ role: "assistant", content: CHAT_GREETING }],
    apiHistory: [],
    lastResult: null,
  };
}

export function loadChat(): ChatPersisted | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as ChatPersisted;
    if (!Array.isArray(data.turns) || data.turns.length === 0) return null;
    return {
      turns: data.turns,
      apiHistory: Array.isArray(data.apiHistory) ? data.apiHistory : [],
      lastResult: data.lastResult ?? null,
    };
  } catch {
    return null;
  }
}

export function saveChat(state: ChatPersisted): void {
  if (typeof window === "undefined") return;
  const hasUser = state.turns.some((t) => t.role === "user");
  if (!hasUser) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota / private mode */
  }
}

export function clearChatStorage(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function chatHasConversation(state: ChatPersisted): boolean {
  return state.turns.some((t) => t.role === "user");
}
