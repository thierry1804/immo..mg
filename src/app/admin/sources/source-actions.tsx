"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

type Props = {
  id: string;
  slug: string;
  enabled: boolean;
  scope: "builtin" | "custom";
};

export default function SourceActions({ id, slug, enabled, scope }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run() {
    const url =
      scope === "builtin"
        ? `/api/admin/scrapers/${slug}/run`
        : `/api/admin/sources/${id}/run`;
    startTransition(async () => {
      const res = await fetch(url, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Échec");
        return;
      }
      alert(`Scrape lancé pour « ${slug} ». Surveillez les logs du worker.`);
      router.refresh();
    });
  }

  function destroy() {
    if (!confirm(`Supprimer la source « ${slug} » ?`)) return;
    startTransition(async () => {
      const res = await fetch(`/api/admin/sources/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Échec");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex shrink-0 gap-2">
      <button
        type="button"
        onClick={run}
        disabled={pending || !enabled}
        className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
        title={enabled ? "Lancer un scrape maintenant" : "Source désactivée"}
      >
        Lancer
      </button>
      {scope === "custom" && (
        <>
          <Link
            href={`/admin/sources/${id}`}
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
          >
            Éditer
          </Link>
          <button
            type="button"
            onClick={destroy}
            disabled={pending}
            className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            Suppr.
          </button>
        </>
      )}
    </div>
  );
}
