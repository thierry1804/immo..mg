import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import SourceForm from "../source-form";

export default async function NewSourcePage() {
  const { user } = await getCurrentSession();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/");
  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link
        href="/admin/sources"
        className="text-sm text-zinc-600 hover:underline"
      >
        ← Toutes les sources
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">Nouvelle source</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Configurez l&apos;adresse du site et les sélecteurs CSS. Le scraper
        appliquera ces sélecteurs sur chaque page d&apos;index pour extraire
        les annonces.
      </p>
      <div className="mt-6">
        <SourceForm />
      </div>
    </div>
  );
}
