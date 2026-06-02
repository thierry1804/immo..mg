import type { Metadata } from "next";
import Link from "next/link";
import PreferencesForm from "@/components/immo/PreferencesForm";
import { getCurrentSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Mes préférences — immo·mg",
  description:
    "Déclarez vos critères pour obtenir un score de compatibilité sur chaque bien.",
};

export default async function PreferencesPage() {
  const { user } = await getCurrentSession();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6 md:py-12">
      <h1 className="font-display text-3xl font-semibold text-navy">
        Mes préférences
      </h1>
      <p className="mt-1 text-ink-2">
        Vos critères déclarés calculent un score de compatibilité sur chaque
        bien — sans jamais suivre votre comportement.
      </p>

      <div className="mt-8">
        {user ? (
          <PreferencesForm />
        ) : (
          <div className="rounded-2xl border border-line bg-white p-8 text-center shadow-card">
            <p className="text-ink-2">
              Connectez-vous pour enregistrer vos préférences et voir votre
              compatibilité.
            </p>
            <div className="mt-4 flex justify-center gap-3">
              <Link
                href="/login"
                className="rounded-full bg-navy px-5 py-2 font-semibold text-paper"
              >
                Connexion
              </Link>
              <Link
                href="/signup"
                className="rounded-full bg-gold px-5 py-2 font-semibold text-navy"
              >
                Créer un compte
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
