"use client";

import Link from "next/link";
import Ico from "./Ico";

export default function ProfileBanner() {
  return (
    <div className="rounded-2xl border border-gold-soft bg-gold-tint/40 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-navy">
            <Ico name="spark" size={16} className="text-gold-700" />
            Construire votre profil conseiller
          </p>
          <p className="mt-0.5 text-xs text-ink-2">
            3 étapes pour débloquer la compatibilité sur chaque bien.
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/80">
            <div className="h-full w-1/3 rounded-full bg-gold" />
          </div>
        </div>
        <Link
          href="/onboarding"
          className="shrink-0 rounded-full bg-navy px-4 py-2 text-xs font-semibold text-paper"
        >
          Commencer
        </Link>
      </div>
    </div>
  );
}
