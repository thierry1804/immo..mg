"use client";

import Ico from "@/components/immo/Ico";
import { formatPrice } from "@/lib/format";
import { PROPERTY_LABEL, sourceLabel } from "@/lib/moderation-labels";
import { REJECT_REASONS, type RejectReason } from "@/lib/moderation-reasons";
import ConfidenceRing from "./ConfidenceRing";
import type { ModerationListing } from "./ModerationListingCard";
import ModerationPhoto from "./ModerationPhoto";
import ModerationPositionEditor from "./ModerationPositionEditor";

/** Signaux de décision branchés plus tard ; masqués proprement tant qu'absents. */
export type ModerationFocusListing = ModerationListing & {
  geo?: { confidence: number; source: string } | null;
  duplicate?: { id: string; score: number; where: string } | null;
  priceFlag?: { kind: "high" | "low"; median: number; note: string } | null;
};

type Props = {
  listing: ModerationFocusListing;
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onApprove: () => void;
  onReject: (reason: RejectReason) => void;
  rejectOpen: boolean;
  onOpenReject: () => void;
  onCloseReject: () => void;
  /** Direction de sortie animée à la décision. */
  exitDir: "ok" | "no" | null;
};

function confWord(c: number): string {
  return c >= 80 ? "élevée" : c >= 60 ? "moyenne" : "faible";
}

export default function ModerationFocusCard({
  listing,
  index,
  total,
  onPrev,
  onNext,
  onApprove,
  onReject,
  rejectOpen,
  onOpenReject,
  onCloseReject,
  exitDir,
}: Props) {
  const locationOk = Boolean(listing.fokontany);
  const surfaceOk = listing.surfaceM2 > 1;
  const isLand = listing.propertyType === "land";
  const roomsOk = listing.rooms > 0;
  const photoCount = listing.photos.length;
  const suggested = listing.duplicate
    ? "duplicate"
    : listing.priceFlag
      ? "price"
      : null;
  const showGeo = listing.locationManual || Boolean(listing.geo);

  return (
    <div className="mx-auto max-w-[920px]">
      {/* nav */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onPrev}
          className="focus-gold inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-sm font-semibold text-navy hover:border-navy-300"
        >
          <Ico name="chevron" size={15} className="rotate-90" />
          Précédente
          <Kbd>K</Kbd>
        </button>
        <span className="tnum text-[13px] font-semibold text-ink-2">
          {index + 1} / {total} à traiter
        </span>
        <button
          type="button"
          onClick={onNext}
          className="focus-gold inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3.5 py-2 text-sm font-semibold text-navy hover:border-navy-300"
        >
          Suivante
          <Kbd>J</Kbd>
          <Ico name="chevron" size={15} className="-rotate-90" />
        </button>
      </div>

      <article
        className="animate-rise overflow-hidden rounded-2xl border border-line bg-white shadow-top-match"
        style={
          exitDir
            ? {
                transform: `translateX(${exitDir === "ok" ? "44px" : "-44px"})`,
                opacity: 0,
                transition: "transform .4s cubic-bezier(.4,0,.2,1), opacity .4s",
              }
            : undefined
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
          {/* evidence column */}
          <div className="flex flex-col border-b border-line md:border-b-0 md:border-r">
            <div className="relative aspect-[16/10] bg-paper-2">
              <ModerationPhoto src={listing.photos[0] ?? ""} />
              <span className="absolute left-3 top-3 rounded-full bg-navy/90 px-2.5 py-1 text-[11px] font-semibold text-paper backdrop-blur">
                {listing.transactionType === "sale" ? "Vente" : "Location"}
              </span>
              <span className="absolute right-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-navy shadow">
                {sourceLabel(listing.source)}
              </span>
              {photoCount > 0 ? (
                <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-navy/90 px-2.5 py-1 text-[11px] font-semibold text-paper backdrop-blur">
                  <Ico name="image" size={12} />
                  {photoCount}
                </span>
              ) : null}
            </div>
            <div className="p-3.5">
              <ModerationPositionEditor
                listingId={listing.id}
                lat={listing.lat}
                lng={listing.lng}
                fokontany={listing.fokontany}
                manual={listing.locationManual}
              />
            </div>
          </div>

          {/* decision column */}
          <div className="flex flex-col">
            <div className="flex-1 p-[18px]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-navy px-2.5 py-1 text-[11px] font-semibold text-paper">
                  {listing.transactionType === "sale" ? "Vente" : "Location"}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-line bg-paper-2 px-2.5 py-1 text-[11px] font-medium text-ink-2">
                  <Ico name="source" size={11} />
                  {sourceLabel(listing.source)}
                </span>
              </div>

              <h2 className="mt-2.5 text-balance font-display text-[22px] font-semibold leading-[1.22] text-navy">
                {listing.title}
              </h2>
              <p className="mt-1.5 text-[13.5px] text-ink-2">{listing.address}</p>

              <p className="tnum mt-3 font-display text-[26px] font-bold leading-none text-navy">
                {formatPrice(listing.price, listing.transactionType)}
              </p>
              {listing.priceFlag ? (
                <p className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-alert">
                  <Ico name="scale" size={12} />
                  {listing.priceFlag.note}
                </p>
              ) : null}

              {/* completeness chips */}
              <div className="mt-3.5 flex flex-wrap gap-2">
                <Chip
                  ok={locationOk}
                  label={locationOk ? listing.fokontany! : "Quartier à recalculer"}
                />
                <Chip
                  ok={surfaceOk}
                  label={surfaceOk ? `${listing.surfaceM2} m²` : "Surface manquante"}
                />
                {isLand ? null : (
                  <Chip
                    ok={roomsOk}
                    label={roomsOk ? `${listing.rooms} pièces` : "Pièces manquantes"}
                  />
                )}
                <span className="inline-flex items-center gap-1 rounded-full bg-paper-2 px-2.5 py-1 text-[12px] font-medium text-ink-2">
                  <Ico name="house" size={12} />
                  {PROPERTY_LABEL[listing.propertyType] ?? listing.propertyType}
                </span>
              </div>

              {/* geo confidence */}
              {showGeo ? (
                <div className="mt-4 flex items-center gap-3.5 rounded-xl border border-line bg-paper p-3.5">
                  <ConfidenceRing
                    score={listing.geo?.confidence ?? 0}
                    locked={listing.locationManual}
                  />
                  <div>
                    <p className="text-[13px] font-bold text-navy">
                      {listing.locationManual
                        ? "Position verrouillée"
                        : `Confiance ${confWord(listing.geo!.confidence)}`}
                    </p>
                    <p className="mt-0.5 text-[12px] text-ink-2">
                      {listing.locationManual
                        ? "Conservée telle quelle à la validation"
                        : listing.geo!.source}
                    </p>
                  </div>
                </div>
              ) : null}

              {/* duplicate */}
              {listing.duplicate ? (
                <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-alert-line bg-alert-bg p-3">
                  <Ico
                    name="layers"
                    size={16}
                    className="mt-0.5 shrink-0 text-alert"
                  />
                  <p className="text-[12.5px] text-ink">
                    <b className="text-alert">
                      Doublon possible · {listing.duplicate.score}%
                    </b>
                    <br />
                    Similaire à #{listing.duplicate.id} — {listing.duplicate.where}.
                  </p>
                </div>
              ) : null}

              {/* description */}
              <details open className="group mt-3 rounded-xl border border-line bg-paper/60">
                <summary className="flex cursor-pointer list-none items-center gap-1.5 px-3 py-2 text-xs font-semibold text-ink-2 marker:content-none [&::-webkit-details-marker]:hidden">
                  <Ico name="doc" size={13} />
                  Description
                  <Ico
                    name="chevron"
                    size={12}
                    className="text-muted transition group-open:rotate-180"
                  />
                </summary>
                <p className="border-t border-line px-3 py-3 text-sm leading-relaxed text-ink-2">
                  {listing.description}
                </p>
              </details>
            </div>

            {/* action bar */}
            <div className="flex items-center gap-2 border-t border-line bg-paper px-[18px] py-3">
              <button
                type="button"
                onClick={onApprove}
                className="focus-gold inline-flex items-center gap-1.5 rounded-full bg-navy px-4 py-2.5 text-sm font-semibold text-paper hover:bg-navy-800"
              >
                <Ico name="check" size={17} />
                Valider
                <Kbd onDark>A</Kbd>
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => (rejectOpen ? onCloseReject() : onOpenReject())}
                  aria-haspopup="menu"
                  aria-expanded={rejectOpen}
                  className="focus-gold inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-4 py-2.5 text-sm font-semibold text-navy hover:border-absent"
                >
                  <Ico name="minus" size={17} />
                  Rejeter…
                  <Kbd>R</Kbd>
                </button>
                {rejectOpen ? (
                  <RejectMenu
                    suggested={suggested}
                    onPick={onReject}
                    onClose={onCloseReject}
                  />
                ) : null}
              </div>
              <span className="flex-1" />
              {listing.externalUrl ? (
                <a
                  href={listing.externalUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="focus-gold inline-flex items-center gap-1 text-xs font-semibold text-navy underline-offset-2 hover:underline"
                >
                  Source
                  <Ico name="send" size={13} className="rotate-[-45deg]" />
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </article>
    </div>
  );
}

function Kbd({
  children,
  onDark,
}: {
  children: React.ReactNode;
  onDark?: boolean;
}) {
  return (
    <kbd
      className={`tnum rounded border px-1.5 text-[11px] font-semibold not-italic leading-[1.4] ${
        onDark
          ? "border-white/25 bg-white/15 text-paper"
          : "border-line bg-paper-2 text-ink-2"
      }`}
    >
      {children}
    </kbd>
  );
}

function Chip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold ${
        ok ? "bg-present-bg text-present" : "bg-absent-bg text-absent"
      }`}
    >
      <Ico name={ok ? "check" : "alert"} size={12} />
      {label}
    </span>
  );
}

function RejectMenu({
  suggested,
  onPick,
  onClose,
}: {
  suggested: string | null;
  onPick: (reason: RejectReason) => void;
  onClose: () => void;
}) {
  return (
    <>
      {/* backdrop */}
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div
        role="menu"
        className="absolute bottom-full left-0 z-40 mb-2 w-[306px] rounded-xl border border-line bg-white p-2 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <h4 className="px-2 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
          Motif du rejet
        </h4>
        <div className="flex flex-col gap-0.5">
          {REJECT_REASONS.map((r, i) => {
            const isSuggested = suggested === r.id;
            return (
              <button
                key={r.id}
                type="button"
                role="menuitem"
                onClick={() => onPick(r)}
                className={`focus-gold flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition ${
                  isSuggested
                    ? "border-alert-line bg-alert-bg"
                    : "border-transparent hover:bg-paper-2"
                }`}
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-paper-2 text-ink-2">
                  <Ico name={r.ico} size={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-[13px] font-semibold text-navy">
                    {r.label}
                    {isSuggested ? (
                      <span className="font-bold text-alert"> · suggéré</span>
                    ) : null}
                  </span>
                  <span className="block text-[11px] font-medium text-muted">
                    {r.hint}
                  </span>
                </span>
                <kbd className="tnum rounded border border-line bg-paper-2 px-1.5 text-[11px] font-semibold not-italic text-ink-2">
                  {i + 1}
                </kbd>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
