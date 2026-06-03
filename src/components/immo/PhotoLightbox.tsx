"use client";

import { useCallback, useEffect, useState } from "react";
import Ico from "./Ico";

export default function PhotoLightbox({
  photos,
  initialIndex = 0,
  onClose,
}: {
  photos: string[];
  initialIndex?: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);

  const prev = useCallback(() => {
    setIndex((i) => (i <= 0 ? photos.length - 1 : i - 1));
  }, [photos.length]);

  const next = useCallback(() => {
    setIndex((i) => (i >= photos.length - 1 ? 0 : i + 1));
  }, [photos.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, prev, next]);

  if (photos.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-navy/90 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Galerie photos"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="focus-gold absolute right-4 top-4 rounded-full bg-white/10 p-2 text-paper"
        aria-label="Fermer"
      >
        <span className="text-lg leading-none">×</span>
      </button>
      {photos.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            className="focus-gold absolute left-4 rounded-full bg-white/10 p-3 text-paper"
            aria-label="Photo précédente"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            className="focus-gold absolute right-14 rounded-full bg-white/10 p-3 text-paper"
            aria-label="Photo suivante"
          >
            ›
          </button>
        </>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photos[index]}
        alt=""
        className="max-h-[85dvh] max-w-full rounded-lg object-contain shadow-drawer"
        onClick={(e) => e.stopPropagation()}
      />
      {photos.length > 1 && (
        <p className="absolute bottom-6 text-sm text-paper/80">
          {index + 1} / {photos.length}
        </p>
      )}
    </div>
  );
}
