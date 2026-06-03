"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { ListingDetail } from "@/lib/listing-detail";
import ListingDetailContent from "./ListingDetailContent";
import ListingDetailSidebar from "./ListingDetailSidebar";
import Ico from "./Ico";
import ListingSkeleton from "./ListingSkeleton";

export default function ListingDrawer({
  listingId,
  onClose,
  onReport,
}: {
  listingId: string | null;
  onClose: () => void;
  onReport?: (id: string) => void;
}) {
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheetSnap, setSheetSnap] = useState<"peek" | "half" | "full">("half");

  const load = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/listings/${id}`);
      if (!res.ok) throw new Error("not found");
      const data = (await res.json()) as { listing: ListingDetail };
      setListing(data.listing);
    } catch {
      setListing(null);
      setError("Impossible de charger ce bien.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!listingId) {
      setListing(null);
      return;
    }
    void load(listingId);
  }, [listingId, load]);

  useEffect(() => {
    if (!listingId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [listingId, onClose]);

  if (!listingId) return null;

  const listingUrl = `/listings/${listingId}`;

  const sheetHeights = {
    peek: "28dvh",
    half: "55dvh",
    full: "92dvh",
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-navy/40 backdrop-blur-[2px] md:bg-navy/30"
        aria-hidden
        onClick={onClose}
      />

      {/* Desktop drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Détail du bien"
        className="fixed inset-y-0 right-0 z-50 hidden w-full max-w-xl flex-col border-l border-line bg-paper shadow-drawer md:flex"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="focus-gold text-sm text-ink-2 hover:text-navy"
          >
            Fermer
          </button>
          <Link
            href={`/listings/${listingId}`}
            className="text-sm font-medium text-navy-600 hover:underline"
          >
            Ouvrir la fiche ↗
          </Link>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading && <ListingSkeleton />}
          {error && <p className="text-sm text-absent">{error}</p>}
          {listing && (
            <div className="grid gap-6">
              <ListingDetailContent listing={listing} />
              <ListingDetailSidebar
                listing={listing}
                listingUrl={listingUrl}
                onReport={onReport ? () => onReport(listingId) : undefined}
              />
            </div>
          )}
        </div>
      </div>

      {/* Mobile bottom sheet */}
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-3xl border border-line bg-paper shadow-drawer md:hidden"
        style={{ height: sheetHeights[sheetSnap] }}
      >
        <div className="flex shrink-0 flex-col items-center border-b border-line px-4 py-2">
          <div className="mb-2 h-1 w-10 rounded-full bg-line" aria-hidden />
          <div className="flex w-full items-center justify-between">
            <div className="flex gap-1">
              {(["peek", "half", "full"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSheetSnap(s)}
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                    sheetSnap === s
                      ? "bg-navy text-paper"
                      : "bg-paper-2 text-muted"
                  }`}
                >
                  {s === "peek" ? "Aperçu" : s === "half" ? "Mi" : "Plein"}
                </button>
              ))}
            </div>
            <button type="button" onClick={onClose} aria-label="Fermer">
              <Ico name="minus" size={18} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading && <ListingSkeleton />}
          {error && <p className="text-sm text-absent">{error}</p>}
          {listing && (
            <>
              <ListingDetailContent listing={listing} />
              <div className="mt-4">
                <ListingDetailSidebar
                  listing={listing}
                  listingUrl={listingUrl}
                  onReport={
                    onReport ? () => onReport(listingId) : undefined
                  }
                />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
