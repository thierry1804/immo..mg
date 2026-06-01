import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { AuthForm } from "../auth-form";

export default async function LoginPage() {
  const { user } = await getCurrentSession();
  if (user) redirect("/");
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="mb-6 text-2xl font-semibold">Se connecter</h1>
      <AuthForm mode="login" />
      <p className="mt-6 text-sm text-zinc-600">
        Pas encore de compte ?{" "}
        <Link href="/signup" className="underline">
          Créer un compte
        </Link>
      </p>
    </div>
  );
}
