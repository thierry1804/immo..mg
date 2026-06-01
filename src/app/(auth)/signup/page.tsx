import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { AuthForm } from "../auth-form";

export default async function SignupPage() {
  const { user } = await getCurrentSession();
  if (user) redirect("/");
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="mb-6 text-2xl font-semibold">Créer un compte</h1>
      <AuthForm mode="signup" />
      <p className="mt-6 text-sm text-zinc-600">
        Déjà un compte ?{" "}
        <Link href="/login" className="underline">
          Se connecter
        </Link>
      </p>
    </div>
  );
}
