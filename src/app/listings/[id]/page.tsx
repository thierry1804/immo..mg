import { and, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db/client";
import { listingPhotos, listings, propertyDetails } from "@/db/schema";
import { formatPrice } from "@/lib/format";

const PROPERTY_LABEL: Record<string, string> = {
  house: "Maison",
  apartment: "Appartement",
  land: "Terrain",
  commercial: "Local commercial",
  other: "Autre",
};

export default async function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const rows = await db
    .select({
      id: listings.id,
      title: listings.title,
      description: listings.description,
      transactionType: listings.transactionType,
      propertyType: listings.propertyType,
      price: listings.price,
      address: listings.address,
      lng: sql<number>`ST_X(${listings.location}::geometry)`,
      lat: sql<number>`ST_Y(${listings.location}::geometry)`,
      createdAt: listings.createdAt,
      surfaceM2: propertyDetails.surfaceM2,
      rooms: propertyDetails.rooms,
      bedrooms: propertyDetails.bedrooms,
      bathrooms: propertyDetails.bathrooms,
    })
    .from(listings)
    .innerJoin(propertyDetails, eq(propertyDetails.listingId, listings.id))
    .where(and(eq(listings.id, id), eq(listings.status, "active")))
    .limit(1);

  if (rows.length === 0) notFound();
  const listing = rows[0];

  const photos = await db
    .select({ path: listingPhotos.path })
    .from(listingPhotos)
    .where(eq(listingPhotos.listingId, id))
    .orderBy(listingPhotos.displayOrder);

  const priceLabel = formatPrice(listing.price, listing.transactionType);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Link href="/" className="text-sm text-zinc-600 hover:underline">
        ← Retour à la carte
      </Link>
      <h1 className="mt-4 text-3xl font-semibold">{listing.title}</h1>
      <p className="mt-1 text-zinc-600">{listing.address}</p>

      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        <span className="rounded bg-zinc-100 px-2 py-1">
          {PROPERTY_LABEL[listing.propertyType]}
        </span>
        <span className="rounded bg-zinc-100 px-2 py-1">
          {listing.transactionType === "sale" ? "Vente" : "Location"}
        </span>
        <span className="rounded bg-zinc-100 px-2 py-1">
          {listing.surfaceM2} m²
        </span>
        <span className="rounded bg-zinc-100 px-2 py-1">
          {listing.rooms} pièces
        </span>
      </div>

      <p className="mt-6 text-2xl font-semibold">{priceLabel}</p>

      {photos.length > 0 && (
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
          {photos.map((p) => (
            <div
              key={p.path}
              className="relative aspect-square overflow-hidden rounded bg-zinc-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.path}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      )}

      <h2 className="mt-8 text-xl font-semibold">Description</h2>
      <p className="mt-2 whitespace-pre-wrap text-zinc-800">
        {listing.description}
      </p>

      <h2 className="mt-8 text-xl font-semibold">Détails</h2>
      <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <dt className="text-zinc-500">Surface</dt>
        <dd>{listing.surfaceM2} m²</dd>
        <dt className="text-zinc-500">Pièces</dt>
        <dd>{listing.rooms}</dd>
        {listing.bedrooms !== null && (
          <>
            <dt className="text-zinc-500">Chambres</dt>
            <dd>{listing.bedrooms}</dd>
          </>
        )}
        {listing.bathrooms !== null && (
          <>
            <dt className="text-zinc-500">Salles de bain</dt>
            <dd>{listing.bathrooms}</dd>
          </>
        )}
        <dt className="text-zinc-500">Coordonnées</dt>
        <dd>
          {listing.lat.toFixed(5)}, {listing.lng.toFixed(5)}
        </dd>
      </dl>
    </div>
  );
}
