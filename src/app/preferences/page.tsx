import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import PreferencesForm from "@/components/immo/PreferencesForm";
import { db } from "@/db/client";
import { userProfiles } from "@/db/schema";
import { getCurrentSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Mes préférences — immo·mg",
  description:
    "Déclarez vos critères pour obtenir un score de compatibilité sur chaque bien.",
};

export default async function PreferencesPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const { user } = await getCurrentSession();
  const sp = await searchParams;
  if (user && sp.new !== "1") {
    const rows = await db
      .select({ userId: userProfiles.userId })
      .from(userProfiles)
      .where(eq(userProfiles.userId, user.id))
      .limit(1);
    if (rows.length === 0) redirect("/onboarding");
  }

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
