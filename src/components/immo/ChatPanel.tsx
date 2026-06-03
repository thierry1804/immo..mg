"use client";

import { useRef, useState } from "react";
import type { SearchFilters } from "@/lib/search-filters";
import type { PreviewListing } from "@/lib/search-preview";
import Ico from "./Ico";
import SearchSummaryCard from "./SearchSummaryCard";

type Turn = { role: "user" | "assistant"; content: string };

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

const GREETING =
  "Bonjour 👋 Décrivez le bien que vous cherchez — type, quartier, budget, équipements — et je prépare la recherche.";

export default function ChatPanel() {
  const [turns, setTurns] = useState<Turn[]>([
    { role: "assistant", content: GREETING },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState<Result | null>(null);
  const histRef = useRef<Turn[]>([]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setBusy(true);
    setInput("");
    const userTurn: Turn = { role: "user", content: text };
    setTurns((t) => [...t, userTurn]);
    try {
      const res = await fetch("/api/search/conversational", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text, history: histRef.current }),
      });
      const data = (await res.json()) as Result;
      const reply = data.clarification || data.summary;
      const botTurn: Turn = { role: "assistant", content: reply };
      setTurns((t) => [...t, botTurn]);
      histRef.current = [...histRef.current, userTurn, botTurn].slice(-12);
      setLastResult(
        Object.keys(data.filters).length > 0 ? data : null,
      );
    } catch {
      setTurns((t) => [
        ...t,
        { role: "assistant", content: "Désolé, une erreur est survenue." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-3.5rem)] max-w-2xl flex-col px-4 md:h-[calc(100dvh-3.5rem)]">
      <div className="flex-1 space-y-3 overflow-y-auto py-6">
        {turns.map((t, i) => (
          <div
            key={i}
            className={t.role === "user" ? "flex justify-end" : "flex justify-start"}
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
        {lastResult?.preview && Object.keys(lastResult.filters).length > 0 && (
          <SearchSummaryCard
            filters={lastResult.filters}
            summary={lastResult.summary}
            preview={lastResult.preview}
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
