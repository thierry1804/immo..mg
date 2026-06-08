import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";
import ModerationFocusView from "@/components/admin/ModerationFocusView";
import ModerationSourceFilters from "@/components/admin/ModerationSourceFilters";
import Ico from "@/components/immo/Ico";
import { db } from "@/db/client";
import { listingPhotos, listings, propertyDetails } from "@/db/schema";
import { getCurrentSession } from "@/lib/auth";
import { decodeHtmlEntities } from "@/lib/listing-location";

export default async function ModerationPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string }>;
}) {
  const { user } = await getCurrentSession();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/");

  const { source: sourceFilter } = await searchParams;

  const sourceCounts = await db
    .select({
      source: listings.source,
      count: count(),
    })
    .from(listings)
    .where(eq(listings.status, "pending_review"))
    .groupBy(listings.source);

  const totalPending = sourceCounts.reduce((n, r) => n + Number(r.count), 0);

  const rows = await db
    .select({
      id: listings.id,
      title: listings.title,
      description: listings.description,
      source: listings.source,
      externalUrl: listings.externalUrl,
      transactionType: listings.transactionType,
      propertyType: listings.propertyType,
      price: listings.price,
      address: listings.address,
      fokontany: listings.fokontany,
      lng: sql<number>`ST_X(${listings.location}::geometry)`,
      lat: sql<number>`ST_Y(${listings.location}::geometry)`,
      surfaceM2: propertyDetails.surfaceM2,
      rooms: propertyDetails.rooms,
      scrapedAt: listings.scrapedAt,
      locationManual: listings.locationManual,
      geoConfidence: listings.geoConfidence,
      geoSource: listings.geoSource,
    })
    .from(listings)
    .innerJoin(propertyDetails, eq(propertyDetails.listingId, listings.id))
    .where(
      sourceFilter
        ? and(
            eq(listings.status, "pending_review"),
            eq(listings.source, sourceFilter),
          )
        : eq(listings.status, "pending_review"),
    )
    .orderBy(desc(listings.scrapedAt));

  const ids = rows.map((r) => r.id);
  const photosByListing = new Map<string, string[]>();
  if (ids.length > 0) {
    const photoRows = await db
      .select({
        listingId: listingPhotos.listingId,
        path: listingPhotos.path,
      })
      .from(listingPhotos)
      .where(inArray(listingPhotos.listingId, ids))
      .orderBy(listingPhotos.displayOrder);
    for (const p of photoRows) {
      const list = photosByListing.get(p.listingId) ?? [];
      list.push(p.path);
      photosByListing.set(p.listingId, list);
    }
  }

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-paper-2">
      <div className="border-b border-line bg-paper">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Administration
              </p>
              <h1 className="mt-1 font-display text-2xl font-semibold text-navy md:text-3xl">
                Modération
              </h1>
              <p className="mt-2 max-w-xl text-sm text-ink-2">
                Validez les annonces importées avant publication sur la carte.
                La position est recalculée à chaque approbation.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/admin/sources"
                className="focus-gold rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-navy hover:border-navy-300"
              >
                Sources
              </Link>
              <Link
                href="/"
                className="focus-gold rounded-full bg-navy px-4 py-2 text-sm font-semibold text-paper hover:bg-navy-800"
              >
                Carte publique
              </Link>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <div className="rounded-2xl border border-gold-soft bg-gold-tint px-4 py-3">
              <p className="text-3xl font-semibold tabular-nums text-navy">
                {totalPending}
              </p>
              <p className="text-xs font-medium text-ink-2">
                en attente{totalPending > 1 ? "s" : ""}
              </p>
            </div>
            {sourceFilter ? (
              <p className="text-sm text-ink-2">
                Filtre actif :{" "}
                <span className="font-semibold text-navy">{sourceFilter}</span>
              </p>
            ) : null}
          </div>

          {sourceCounts.length > 0 ? (
            <div className="mt-4">
              <ModerationSourceFilters
                counts={sourceCounts.map((r) => ({
                  source: r.source,
                  count: Number(r.count),
                }))}
                total={totalPending}
                activeSource={sourceFilter}
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-white px-6 py-16 text-center shadow-card">
            <Ico name="shield" size={28} className="mx-auto text-gold-700" />
            <p className="mt-4 font-display text-lg font-semibold text-navy">
              {sourceFilter
                ? "Aucune annonce pour cette source"
                : "Rien à modérer"}
            </p>
            <p className="mt-2 text-sm text-ink-2">
              {sourceFilter ? (
                <Link href="/admin/moderation" className="font-semibold underline">
                  Voir toutes les sources
                </Link>
              ) : (
                <>
                  Lancez le worker ou une source depuis{" "}
                  <Link href="/admin/sources" className="font-semibold underline">
                    Sources & scrapers
                  </Link>
                  .
                </>
              )}
            </p>
          </div>
        ) : (
          <ModerationFocusView
            listings={rows.map((l) => ({
              ...l,
              propertyType: l.propertyType,
              title: decodeHtmlEntities(l.title),
              description: decodeHtmlEntities(l.description),
              photos: photosByListing.get(l.id) ?? [],
              geo:
                l.geoConfidence != null
                  ? { confidence: l.geoConfidence, source: l.geoSource ?? "" }
                  : null,
            }))}
          />
        )}
      </div>
    </div>
  );
}
