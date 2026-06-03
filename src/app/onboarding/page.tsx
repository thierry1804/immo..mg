import type { Metadata } from "next";
import { redirect } from "next/navigation";
import OnboardingWizard from "@/components/immo/OnboardingWizard";
import { getCurrentSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Votre profil — immo·mg",
};

export default async function OnboardingPage() {
  const { user } = await getCurrentSession();
  if (!user) redirect("/login?next=/onboarding");

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 md:px-6">
      <h1 className="font-display text-3xl font-semibold text-navy">
        Construire votre profil
      </h1>
      <p className="mt-2 text-ink-2">
        Trois étapes pour activer la compatibilité et les alertes personnalisées.
      </p>
      <div className="mt-8">
        <OnboardingWizard />
      </div>
    </div>
  );
}
