"use client";

import { useState } from "react";
import type { SearchFilters } from "@/lib/search-filters";
import type { PreviewListing } from "@/lib/search-preview";
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

const CHIPS = [
  "Maison à louer à Ivandry avec gardien",
  "Terrain à vendre, budget max 500 millions",
  "Appartement 3 pièces avec parking",
];

/**
 * Conversational search bar: a free-text French query is sent to
 * /api/search/conversational, and the extracted filters are merged into the
 * active search. Quick chips seed common intents.
 */
export default function ConversationalBar({
  onFilters,
}: {
  onFilters: (f: SearchFilters) => void;
}) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(q: string) {
    const text = q.trim();
    if (!text || busy) return;
    setBusy(true);
    setQuery(text);
    try {
      const res = await fetch("/api/search/conversational", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text }),
      });
      const data = (await res.json()) as Result;
      setResult(data);
      if (Object.keys(data.filters).length > 0) onFilters(data.filters);
    } catch {
      setResult(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(query);
        }}
        className="flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 shadow-card focus-within:border-navy"
      >
        <Ico name="spark" size={18} className="shrink-0 text-gold-700" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Décrivez le bien idéal : « villa à louer à Ivandry, gardien, budget 3M »"
          className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
          aria-label="Recherche conversationnelle"
        />
        <button
          type="submit"
          disabled={busy}
          aria-busy={busy}
          className="focus-gold inline-flex shrink-0 items-center gap-1 rounded-full bg-navy px-3 py-1.5 text-xs font-semibold text-paper transition hover:bg-navy-700 active:scale-[0.98] disabled:opacity-60"
        >
          {busy ? (
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-paper/30 border-t-paper" />
          ) : (
            <Ico name="send" size={14} />
          )}
          <span className="hidden sm:inline">{busy ? "Analyse…" : "Rechercher"}</span>
        </button>
      </form>

      {result?.clarification && (
        <p className="mt-2 px-1 text-xs text-gold-700" role="status">
          {result.clarification}
        </p>
      )}
      {result && !result.clarification && result.preview && (
        <SearchSummaryCard
          filters={result.filters}
          summary={result.summary}
          preview={result.preview}
        />
      )}
      {!result ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {CHIPS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => void run(c)}
              className="rounded-full border border-line bg-paper px-2.5 py-1 text-[11px] text-ink-2 transition hover:border-navy-300 hover:text-navy"
            >
              {c}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
