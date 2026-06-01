import { desc, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { listingPhotos, listings, propertyDetails } from "@/db/schema";
import { getCurrentSession } from "@/lib/auth";
import { formatPrice } from "@/lib/format";
import ModerationActions from "./moderation-actions";

const SOURCE_LABEL: Record<string, string> = {
  user: "Utilisateur",
  bazary: "Bazary",
  jovenna: "Jovenna",
  lacoteimmobiliere: "LaCoteImmobiliere",
  coinafrique: "CoinAfrique",
  facebook: "Facebook",
};

export default async function ModerationPage() {
  const { user } = await getCurrentSession();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/");

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
      lng: sql<number>`ST_X(${listings.location}::geometry)`,
      lat: sql<number>`ST_Y(${listings.location}::geometry)`,
      surfaceM2: propertyDetails.surfaceM2,
      rooms: propertyDetails.rooms,
      scrapedAt: listings.scrapedAt,
    })
    .from(listings)
    .innerJoin(propertyDetails, eq(propertyDetails.listingId, listings.id))
    .where(eq(listings.status, "pending_review"))
    .orderBy(desc(listings.scrapedAt));

  const photosByListing = new Map<string, string[]>();
  if (rows.length > 0) {
    const photoRows = await db
      .select({
        listingId: listingPhotos.listingId,
        path: listingPhotos.path,
      })
      .from(listingPhotos)
      .where(
        sql`${listingPhotos.listingId} = ANY (${sql.raw(
          `ARRAY[${rows.map((r) => `'${r.id}'`).join(",")}]`,
        )})`,
      )
      .orderBy(listingPhotos.displayOrder);
    for (const p of photoRows) {
      const list = photosByListing.get(p.listingId) ?? [];
      list.push(p.path);
      photosByListing.set(p.listingId, list);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="mb-1 text-2xl font-semibold">Modération</h1>
      <p className="mb-6 text-sm text-zinc-600">
        {rows.length} annonce{rows.length > 1 ? "s" : ""} en attente.
      </p>

      {rows.length === 0 ? (
        <p className="rounded border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500">
          Rien à modérer. Les annonces scrapées apparaîtront ici après chaque
          tour du worker.
        </p>
      ) : (
        <ul className="space-y-4">
          {rows.map((l) => {
            const photos = photosByListing.get(l.id) ?? [];
            return (
              <li
                key={l.id}
                className="grid gap-4 rounded border border-zinc-200 bg-white p-4 md:grid-cols-[160px_1fr_auto]"
              >
                <div className="aspect-square overflow-hidden rounded bg-zinc-100">
                  {photos[0] ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={photos[0]}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-zinc-400">
                      pas de photo
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex flex-wrap items-baseline gap-2">
                    <h2 className="text-base font-semibold">{l.title}</h2>
                    <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs">
                      {SOURCE_LABEL[l.source] ?? l.source}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-600">{l.address}</p>
                  <p className="mt-2 text-base font-semibold">
                    {formatPrice(l.price, l.transactionType)}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {l.surfaceM2} m² · {l.rooms} pcs ·{" "}
                    {l.lat.toFixed(4)}, {l.lng.toFixed(4)}
                  </p>
                  {l.externalUrl && (
                    <a
                      href={l.externalUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="mt-2 inline-block text-xs text-blue-700 underline"
                    >
                      Voir l&apos;annonce source ↗
                    </a>
                  )}
                  <p className="mt-2 line-clamp-3 text-sm text-zinc-700">
                    {l.description}
                  </p>
                </div>
                <ModerationActions id={l.id} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
