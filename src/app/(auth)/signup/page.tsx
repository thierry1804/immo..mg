import Link from "next/link";
import { redirect } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import { getCurrentSession } from "@/lib/auth";
import { getDevLoginPanel } from "@/lib/dev-access";
import { AuthForm } from "../auth-form";

export default async function SignupPage() {
  const { user } = await getCurrentSession();
  if (user) redirect("/");

  const panel = getDevLoginPanel();
  const bootstrap = panel.bootstrapEmail;

  return (
    <AuthShell
      title="Créer un compte"
      subtitle={
        bootstrap
          ? `Utilisez ${bootstrap} pour obtenir le rôle administrateur à l’inscription (BOOTSTRAP_ADMIN_EMAIL).`
          : "Rejoignez immo·mg pour sauvegarder vos recherches et activer la compatibilité profil."
      }
      footer={
        <>
          Déjà un compte ?{" "}
          <Link href="/login" className="focus-gold font-semibold text-navy underline-offset-2 hover:underline">
            Se connecter
          </Link>
        </>
      }
    >
      <AuthForm mode="signup" />
    </AuthShell>
  );
}
