"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Ico from "@/components/immo/Ico";
import { REJECT_REASONS, type RejectReason } from "@/lib/moderation-reasons";
import ModerationFocusCard, {
  type ModerationFocusListing,
} from "./ModerationFocusCard";

type Decision = "approved" | "rejected";
type Toast =
  | { kind: "approved"; title: string }
  | { kind: "rejected"; title: string; reason: RejectReason | null }
  | { kind: "error"; title: string };

const EXIT_MS = 400;

export default function ModerationFocusView({
  listings,
}: {
  listings: ModerationFocusListing[];
}) {
  const [queue, setQueue] = useState(listings);
  const [index, setIndex] = useState(0);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [exit, setExit] = useState<{ id: string; dir: "ok" | "no" } | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  // Pour l'annulation : on garde la dernière annonce retirée + sa position.
  const lastAction = useRef<{ listing: ModerationFocusListing; at: number } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Resync en phase de rendu quand le serveur renvoie une nouvelle file
  // (navigation, changement de filtre, reload) — pattern React « ajuster
  // l'état pendant le rendu », sans effet ni cascade.
  const [seen, setSeen] = useState(listings);
  if (seen !== listings) {
    setSeen(listings);
    setQueue(listings);
    setIndex((i) => Math.max(0, Math.min(i, listings.length - 1)));
  }

  const current = queue[Math.min(index, queue.length - 1)];

  const showToast = useCallback((t: Toast) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(t);
    toastTimer.current = setTimeout(() => setToast(null), 6000);
  }, []);

  const decide = useCallback(
    (status: Decision, reason: RejectReason | null = null) => {
      const listing = current;
      if (!listing) return;
      const at = index;
      const dir = status === "approved" ? "ok" : "no";

      setRejectingId(null);
      setExit({ id: listing.id, dir });
      lastAction.current = { listing, at };

      const reduce =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const remove = () => {
        setExit(null);
        setQueue((q) => q.filter((l) => l.id !== listing.id));
        // La file perd un élément : on reste à la même position, bornée.
        setIndex((i) => Math.max(0, Math.min(i, queue.length - 2)));
      };
      if (reduce) remove();
      else setTimeout(remove, EXIT_MS);

      showToast(
        status === "approved"
          ? { kind: "approved", title: listing.title }
          : { kind: "rejected", title: listing.title, reason },
      );

      // Optimiste : on appelle l'API en arrière-plan, on réinsère en cas d'échec.
      const action = status === "approved" ? "approve" : "reject";
      void fetch(`/api/admin/listings/${listing.id}/${action}`, {
        method: "POST",
        headers: reason ? { "Content-Type": "application/json" } : undefined,
        body: reason ? JSON.stringify({ reason: reason.id }) : undefined,
      })
        .then((res) => {
          if (!res.ok) throw new Error("api");
        })
        .catch(() => {
          setQueue((q) =>
            q.some((l) => l.id === listing.id)
              ? q
              : [...q.slice(0, at), listing, ...q.slice(at)],
          );
          showToast({ kind: "error", title: listing.title });
        });
    },
    [current, index, queue.length, showToast],
  );

  // Annulation purement cliente : remet l'annonce dans la file locale.
  // (Le statut serveur a déjà changé ; un vrai revert viendra avec le back.)
  const undo = useCallback(() => {
    const u = lastAction.current;
    if (!u) return;
    setQueue((q) =>
      q.some((l) => l.id === u.listing.id)
        ? q
        : [...q.slice(0, u.at), u.listing, ...q.slice(u.at)],
    );
    setIndex(u.at);
    lastAction.current = null;
    setToast(null);
  }, []);

  // Couche clavier.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable)
      )
        return;

      // Menu motif ouvert : il capte 1–7 et Échap.
      if (rejectingId) {
        if (e.key === "Escape") {
          e.preventDefault();
          setRejectingId(null);
          return;
        }
        const n = Number.parseInt(e.key, 10);
        if (n >= 1 && n <= REJECT_REASONS.length) {
          e.preventDefault();
          decide("rejected", REJECT_REASONS[n - 1]);
        }
        return;
      }

      const k = e.key.toLowerCase();
      if (k === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setHelpOpen((v) => !v);
        return;
      }
      if (k === "u") {
        e.preventDefault();
        undo();
        return;
      }
      if (!queue.length) return;

      if (k === "j" || e.key === "ArrowRight") {
        e.preventDefault();
        setIndex((i) => Math.min(queue.length - 1, i + 1));
      } else if (k === "k" || e.key === "ArrowLeft") {
        e.preventDefault();
        setIndex((i) => Math.max(0, i - 1));
      } else if (k === "a") {
        e.preventDefault();
        decide("approved");
      } else if (k === "r") {
        e.preventDefault();
        setRejectingId(current?.id ?? null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [queue.length, rejectingId, decide, undo, current]);

  if (queue.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-white px-6 py-16 text-center shadow-card">
        <Ico name="shield" size={28} className="mx-auto text-gold-700" />
        <p className="mt-4 font-display text-lg font-semibold text-navy">
          File traitée 🎉
        </p>
        <p className="mt-2 text-sm text-ink-2">
          Toutes les annonces en attente ont été décidées. Appuyez sur{" "}
          <kbd className="rounded border border-line bg-paper-2 px-1.5 text-[11px] font-semibold text-ink-2">
            U
          </kbd>{" "}
          pour annuler la dernière.
        </p>
      </div>
    );
  }

  const safeIndex = Math.min(index, queue.length - 1);

  return (
    <div>
      <div className="mx-auto mb-2 flex max-w-[920px] justify-end">
        <button
          type="button"
          onClick={() => setHelpOpen((v) => !v)}
          className="focus-gold inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink-2 hover:border-navy-300"
        >
          Raccourcis
          <kbd className="rounded border border-line bg-paper-2 px-1.5 text-[11px] font-semibold text-ink-2">
            ?
          </kbd>
        </button>
      </div>

      <ModerationFocusCard
        key={current.id}
        listing={current}
        index={safeIndex}
        total={queue.length}
        onPrev={() => setIndex((i) => Math.max(0, i - 1))}
        onNext={() => setIndex((i) => Math.min(queue.length - 1, i + 1))}
        onApprove={() => decide("approved")}
        onReject={(reason) => decide("rejected", reason)}
        rejectOpen={rejectingId === current.id}
        onOpenReject={() => setRejectingId(current.id)}
        onCloseReject={() => setRejectingId(null)}
        exitDir={exit?.id === current.id ? exit.dir : null}
      />

      {helpOpen ? <ShortcutsHelp onClose={() => setHelpOpen(false)} /> : null}

      {/* toast */}
      <div className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center px-4">
        {toast ? (
          <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-navy px-4 py-2.5 text-sm text-paper shadow-drawer">
            <span
              className={`grid h-6 w-6 place-items-center rounded-full ${
                toast.kind === "approved"
                  ? "bg-present text-paper"
                  : toast.kind === "error"
                    ? "bg-alert text-paper"
                    : "bg-white/15 text-paper"
              }`}
            >
              <Ico
                name={
                  toast.kind === "approved"
                    ? "check"
                    : toast.kind === "error"
                      ? "alert"
                      : "minus"
                }
                size={14}
              />
            </span>
            <span>
              {toast.kind === "approved" ? (
                <>
                  <b>Publiée</b> sur la carte
                  <span className="text-paper/70"> · position conservée</span>
                </>
              ) : toast.kind === "error" ? (
                <>
                  <b>Échec</b> — annonce remise en file
                </>
              ) : (
                <>
                  <b>Rejetée</b>
                  {toast.reason ? (
                    <span className="text-paper/70"> · {toast.reason.label}</span>
                  ) : null}
                </>
              )}
            </span>
            {toast.kind !== "error" ? (
              <button
                type="button"
                onClick={undo}
                className="focus-gold inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold hover:bg-white/25"
              >
                <Ico name="chevron" size={13} className="rotate-90" />
                Annuler
                <kbd className="rounded border border-white/25 bg-white/15 px-1.5 text-[11px] font-semibold">
                  U
                </kbd>
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ShortcutsHelp({ onClose }: { onClose: () => void }) {
  const rows: [string, string[]][] = [
    ["Annonce suivante", ["J", "→"]],
    ["Annonce précédente", ["K", "←"]],
    ["Valider", ["A"]],
    ["Rejeter (motif)", ["R"]],
    ["Choisir un motif", ["1", "…", "7"]],
    ["Annuler la dernière", ["U"]],
    ["Fermer le menu", ["Échap"]],
  ];
  return (
    <>
      <div className="fixed inset-0 z-50" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 w-[320px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line bg-white p-4 shadow-drawer">
        <h4 className="font-display text-base font-semibold text-navy">
          Raccourcis clavier
        </h4>
        <div className="mt-3 space-y-1.5">
          {rows.map(([label, keys]) => (
            <div
              key={label}
              className="flex items-center justify-between gap-3 text-sm text-ink-2"
            >
              <span>{label}</span>
              <span className="flex gap-1">
                {keys.map((kk, i) => (
                  <kbd
                    key={i}
                    className="tnum rounded border border-line bg-paper-2 px-1.5 text-[11px] font-semibold text-ink-2"
                  >
                    {kk}
                  </kbd>
                ))}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
