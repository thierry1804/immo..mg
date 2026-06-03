import Link from "next/link";
import { redirect } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import { getCurrentSession } from "@/lib/auth";
import { getDevLoginPanel } from "@/lib/dev-access";
import LoginForm from "./login-form";

export default async function LoginPage() {
  const { user } = await getCurrentSession();
  if (user) redirect("/");

  const panel = getDevLoginPanel();

  return (
    <AuthShell
      title="Se connecter"
      subtitle="Retrouvez vos favoris, votre profil conseiller et l’accès modération si vous êtes administrateur."
      footer={
        <>
          Pas encore de compte ?{" "}
          <Link href="/signup" className="focus-gold font-semibold text-navy underline-offset-2 hover:underline">
            Créer un compte
          </Link>
        </>
      }
    >
      <LoginForm panel={panel} />
    </AuthShell>
  );
}
