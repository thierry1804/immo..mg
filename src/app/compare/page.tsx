import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import CompareScreen from "@/components/immo/CompareScreen";

export const metadata: Metadata = {
  title: "Comparer — immo·mg",
  description: "Comparez jusqu'à trois biens côte à côte.",
};

export default function ComparePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-navy"
      >
        <Ico /> Retour aux biens
      </Link>
      <h1 className="mt-3 font-display text-3xl font-semibold text-navy">
        Comparateur
      </h1>
      <p className="mt-1 text-ink-2">
        La meilleure valeur de chaque critère est surlignée.
      </p>
      <div className="mt-6 rounded-2xl border border-line bg-white shadow-card">
        <Suspense
          fallback={
            <p className="py-12 text-center text-sm text-muted">Chargement…</p>
          }
        >
          <CompareScreen />
        </Suspense>
      </div>
    </div>
  );
}

function Ico() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}
