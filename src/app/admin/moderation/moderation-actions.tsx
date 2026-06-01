"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export default function ModerationActions({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function act(action: "approve" | "reject") {
    startTransition(async () => {
      const res = await fetch(`/api/admin/listings/${id}/${action}`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Erreur");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => act("approve")}
        disabled={pending}
        className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
      >
        Approuver
      </button>
      <button
        type="button"
        onClick={() => act("reject")}
        disabled={pending}
        className="rounded bg-red-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
      >
        Rejeter
      </button>
    </div>
  );
}
