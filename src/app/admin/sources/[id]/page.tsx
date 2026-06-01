import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db/client";
import { scrapeSources } from "@/db/schema";
import { getCurrentSession } from "@/lib/auth";
import SourceForm, { type SourceFormValues } from "../source-form";

export default async function EditSourcePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await getCurrentSession();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/");

  const { id } = await params;
  const rows = await db
    .select()
    .from(scrapeSources)
    .where(eq(scrapeSources.id, id))
    .limit(1);
  if (rows.length === 0) notFound();
  const s = rows[0];

  const initial: SourceFormValues = {
    slug: s.slug,
    name: s.name,
    enabled: s.enabled,
    baseUrl: s.baseUrl,
    listUrls: s.listUrls.join("\n"),
    cardSelector: s.selectors.card,
    linkSelector: s.selectors.link,
    titleSelector: s.selectors.title,
    priceSelector: s.selectors.price,
    addressSelector: s.selectors.address,
    imageSelector: s.selectors.image ?? "",
    defaultTransactionType:
      (s.defaultTransactionType as "" | "sale" | "rent" | null) ?? "",
    maxPages: String(s.maxPages),
    throttleMs: String(s.throttleMs),
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link
        href="/admin/sources"
        className="text-sm text-zinc-600 hover:underline"
      >
        ← Toutes les sources
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">Éditer « {s.name} »</h1>
      <div className="mt-6">
        <SourceForm initial={initial} sourceId={s.id} />
      </div>
    </div>
  );
}
