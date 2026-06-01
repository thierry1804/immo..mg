import { desc } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { scrapeSources } from "@/db/schema";
import { getCurrentSession } from "@/lib/auth";
import SourceActions from "./source-actions";

export default async function SourcesPage() {
  const { user } = await getCurrentSession();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/");

  const sources = await db
    .select()
    .from(scrapeSources)
    .orderBy(desc(scrapeSources.createdAt));

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Sources de scraping</h1>
        <Link
          href="/admin/sources/new"
          className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white"
        >
          + Nouvelle source
        </Link>
      </div>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-semibold text-zinc-700">
          Sources intégrées
        </h2>
        <BuiltinSourceRow slug="coinafrique" label="CoinAfrique Madagascar" />
        <BuiltinSourceRow
          slug="facebook"
          label="Facebook (expérimental)"
          warning="Désactivé par défaut — voir FB_SCRAPER_ENABLED"
        />
      </section>

      <section className="mt-8">
        <h2 className="mb-2 text-sm font-semibold text-zinc-700">
          Sources personnalisées
        </h2>
        {sources.length === 0 ? (
          <p className="rounded border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
            Aucune source configurée. Ajoutez-en une pour commencer à scraper
            un nouveau site.
          </p>
        ) : (
          <ul className="space-y-2">
            {sources.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between gap-4 rounded border border-zinc-200 bg-white p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{s.name}</p>
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs ${
                        s.enabled
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-zinc-100 text-zinc-500"
                      }`}
                    >
                      {s.enabled ? "actif" : "désactivé"}
                    </span>
                    <code className="text-xs text-zinc-500">{s.slug}</code>
                  </div>
                  <p className="truncate text-xs text-zinc-500">
                    {s.listUrls.length} URL(s) · cadence {s.throttleMs}ms · max{" "}
                    {s.maxPages} page(s){" "}
                    {s.lastRunAt &&
                      `· dernière exécution ${new Date(
                        s.lastRunAt,
                      ).toLocaleString("fr-FR")}`}
                  </p>
                </div>
                <SourceActions
                  id={s.id}
                  slug={s.slug}
                  enabled={s.enabled}
                  scope="custom"
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function BuiltinSourceRow({
  slug,
  label,
  warning,
}: {
  slug: string;
  label: string;
  warning?: string;
}) {
  return (
    <div className="mb-2 flex items-center justify-between gap-4 rounded border border-zinc-200 bg-white p-3">
      <div className="min-w-0">
        <p className="font-medium">{label}</p>
        <p className="text-xs text-zinc-500">
          <code>{slug}</code>
          {warning && <span className="ml-2 text-amber-700">{warning}</span>}
        </p>
      </div>
      <SourceActions id={slug} slug={slug} enabled={true} scope="builtin" />
    </div>
  );
}
