import Link from "next/link";
import type { ReactNode } from "react";
import Ico from "@/components/immo/Ico";

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer: ReactNode;
};

export default function AuthShell({ title, subtitle, children, footer }: Props) {
  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-paper md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <aside className="relative hidden overflow-hidden bg-navy px-10 py-14 text-paper md:flex md:flex-col md:justify-between">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          aria-hidden
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 12px)",
          }}
        />
        <div className="relative">
          <Link
            href="/"
            className="focus-gold font-display text-2xl font-semibold tracking-tight"
          >
            immo<span className="text-gold">·</span>mg
          </Link>
          <p className="mt-8 max-w-sm font-display text-3xl font-semibold leading-snug text-paper">
            Conseiller immobilier pour Antananarivo
          </p>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-navy-100">
            Carte, compatibilité profil, modération des sources et recherche
            conversationnelle — un seul compte pour tout piloter.
          </p>
        </div>
        <ul className="relative mt-10 space-y-3 text-sm text-navy-100">
          <li className="flex items-start gap-2">
            <Ico name="pin" size={16} className="mt-0.5 shrink-0 text-gold" />
            Biens agrégés sur la carte
          </li>
          <li className="flex items-start gap-2">
            <Ico name="shield" size={16} className="mt-0.5 shrink-0 text-gold" />
            Scores de confiance & modération
          </li>
          <li className="flex items-start gap-2">
            <Ico name="spark" size={16} className="mt-0.5 shrink-0 text-gold" />
            Recherche en langage naturel
          </li>
        </ul>
      </aside>

      <div className="flex flex-col justify-center px-6 py-10 md:px-12 md:py-14 lg:px-16">
        <div className="mx-auto w-full max-w-md animate-rise">
          <Link
            href="/"
            className="focus-gold mb-8 inline-block font-display text-xl font-semibold text-navy md:hidden"
          >
            immo<span className="text-gold">·</span>mg
          </Link>
          <h1 className="font-display text-2xl font-semibold text-navy md:text-3xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 text-sm leading-relaxed text-ink-2">{subtitle}</p>
          ) : null}
          <div className="mt-8">{children}</div>
          <div className="mt-8 text-sm text-ink-2">{footer}</div>
        </div>
      </div>
    </div>
  );
}
