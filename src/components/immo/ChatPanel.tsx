"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SearchFilters } from "@/lib/search-filters";
import type { PreviewListing } from "@/lib/search-preview";
import {
  chatHasConversation,
  clearChatStorage,
  defaultChatState,
  loadChat,
  saveChat,
  type ChatPersisted,
  type ChatTurn,
} from "@/lib/chat-storage";
import Ico from "./Ico";
import SearchSummaryCard from "./SearchSummaryCard";

type Result = {
  filters: SearchFilters;
  summary: string;
  clarification?: string;
  source: "openai" | "fallback";
  preview?: {
    total: number;
    listings: PreviewListing[];
    medianHint: string | null;
  };
};

export default function ChatPanel() {
  const [state, setState] = useState<ChatPersisted>(defaultChatState);
  const [hydrated, setHydrated] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const histRef = useRef<ChatTurn[]>([]);

  useEffect(() => {
    const saved = loadChat();
    if (saved) {
      setState(saved);
      histRef.current = saved.apiHistory;
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveChat(state);
    histRef.current = state.apiHistory;
  }, [state, hydrated]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [state.turns, state.lastResult, busy]);

  const clearConversation = useCallback(() => {
    const fresh = defaultChatState();
    setState(fresh);
    histRef.current = [];
    clearChatStorage();
  }, []);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setBusy(true);
    setInput("");
    const userTurn: ChatTurn = { role: "user", content: text };
    setState((s) => ({ ...s, turns: [...s.turns, userTurn] }));
    try {
      const res = await fetch("/api/search/conversational", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text, history: histRef.current }),
      });
      const data = (await res.json()) as Result;
      const reply = data.clarification || data.summary;
      const botTurn: ChatTurn = { role: "assistant", content: reply };
      const apiHistory = [...histRef.current, userTurn, botTurn].slice(-12);
      setState((s) => ({
        turns: [...s.turns, botTurn],
        apiHistory,
        lastResult:
          Object.keys(data.filters).length > 0 && data.preview
            ? {
                filters: data.filters,
                summary: data.summary,
                preview: data.preview,
              }
            : s.lastResult,
      }));
    } catch {
      setState((s) => ({
        ...s,
        turns: [
          ...s.turns,
          { role: "assistant", content: "Désolé, une erreur est survenue." },
        ],
      }));
    } finally {
      setBusy(false);
    }
  }

  const hasHistory = chatHasConversation(state);

  return (
    <div className="mx-auto flex h-[calc(100dvh-3.5rem)] max-w-2xl flex-col px-4 md:h-[calc(100dvh-3.5rem)]">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Assistant recherche
        </p>
        {hasHistory ? (
          <button
            type="button"
            onClick={clearConversation}
            className="focus-gold rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-2 transition hover:border-absent hover:text-navy"
          >
            Effacer la discussion
          </button>
        ) : null}
      </div>

      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto py-4"
      >
        {state.turns.map((t, i) => (
          <div
            key={`${i}-${t.role}-${t.content.slice(0, 24)}`}
            className={
              t.role === "user" ? "flex justify-end" : "flex justify-start"
            }
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                t.role === "user"
                  ? "bg-navy text-paper"
                  : "border border-line bg-white text-ink shadow-card"
              }`}
            >
              {t.content}
            </div>
          </div>
        ))}
        {busy && (
          <p className="text-xs text-muted" role="status">
            Analyse en cours…
          </p>
        )}
        {state.lastResult?.preview &&
          Object.keys(state.lastResult.filters).length > 0 && (
            <SearchSummaryCard
              filters={state.lastResult.filters}
              summary={state.lastResult.summary}
              preview={state.lastResult.preview}
            />
          )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="sticky bottom-0 mb-2 flex items-center gap-2 rounded-full border border-line bg-white/95 px-3 py-2 shadow-card backdrop-blur-sm focus-within:border-navy md:mb-4"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Votre message…"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
          aria-label="Message"
        />
        <button
          type="submit"
          disabled={busy}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-navy text-paper transition hover:bg-navy-700 disabled:opacity-60"
          aria-label="Envoyer"
        >
          <Ico name="send" size={16} />
        </button>
      </form>
    </div>
  );
}
