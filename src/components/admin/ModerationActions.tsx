"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Ico from "@/components/immo/Ico";

export default function ModerationActions({
  id,
  className = "",
}: {
  id: string;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function act(action: "approve" | "reject") {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/admin/listings/${id}/${action}`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(data.error ?? "Action impossible.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div
      className={`flex shrink-0 flex-row gap-2 sm:flex-col ${className}`.trim()}
    >
      <button
        type="button"
        onClick={() => act("approve")}
        disabled={pending}
        aria-label={pending ? "Approbation en cours" : "Approuver l'annonce"}
        title="Approuver"
        className="focus-gold inline-flex h-10 w-10 items-center justify-center rounded-full bg-navy text-paper transition hover:bg-navy-800 disabled:opacity-50"
      >
        <Ico name="check" size={18} />
      </button>
      <button
        type="button"
        onClick={() => act("reject")}
        disabled={pending}
        aria-label={pending ? "Action en cours" : "Rejeter l'annonce"}
        title="Rejeter"
        className="focus-gold inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-ink-2 transition hover:border-absent hover:text-navy disabled:opacity-50"
      >
        <Ico name="minus" size={18} />
      </button>
      {error ? (
        <p className="rounded-lg bg-absent-bg px-2 py-1.5 text-[11px] text-navy" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
