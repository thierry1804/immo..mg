import { and, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import AmenityTag from "@/components/immo/AmenityTag";
import ConfidenceBar from "@/components/immo/ConfidenceBar";
import Ico from "@/components/immo/Ico";
import RealCostEstimator from "@/components/immo/RealCostEstimator";
import { db } from "@/db/client";
import { listingPhotos, listings, propertyDetails } from "@/db/schema";
import { AMENITIES, type Amenity } from "@/lib/amenities";
import type { ConfidenceCheck } from "@/lib/confidence";
import { formatPrice } from "@/lib/format";
import { estimateRealCost } from "@/lib/real-cost";

const PROPERTY_LABEL: Record<string, string> = {
  house: "Maison",
  apartment: "Appartement",
  land: "Terrain",
  commercial: "Local commercial",
  other: "Autre",
};

const SOURCE_LABEL: Record<string, string> = {
  user: "Annonce directe",
  coinafrique: "CoinAfrique",
  facebook: "Facebook",
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
      fokontany: listings.fokontany,
      amenities: listings.amenities,
      confidenceScore: listings.confidenceScore,
      confidenceBreakdown: listings.confidenceBreakdown,
      pricePerSqm: listings.pricePerSqm,
      sources: listings.sources,
      lng: sql<number>`ST_X(${listings.location}::geometry)`,
      lat: sql<number>`ST_Y(${listings.location}::geometry)`,
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
  const amenities = (listing.amenities ?? []) as Amenity[];
  const amenitySet = new Set(amenities);
  const breakdown = (listing.confidenceBreakdown ?? []) as ConfidenceCheck[];
  const sources = listing.sources ?? [];
  const realCost = estimateRealCost({
    price: listing.price,
    transactionType: listing.transactionType,
    surfaceM2: listing.surfaceM2,
    amenities,
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-navy"
      >
        <Ico name="pin" size={14} /> Retour à la carte
      </Link>

      {/* Hero */}
      <div className="mt-4 overflow-hidden rounded-3xl">
        {photos.length > 0 ? (
          <div className="grid grid-cols-2 gap-1 md:grid-cols-4">
            <div className="col-span-2 row-span-2 aspect-[4/3] md:aspect-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photos[0].path}
                alt=""
                className="h-full w-full object-cover"
              />
            </div>
            {photos.slice(1, 5).map((p) => (
              <div key={p.path} className="aspect-[4/3]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.path}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="ph grid aspect-[16/7] w-full place-items-center text-sm">
            immo·mg — photo indisponible
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-8 md:grid-cols-[1fr_320px]">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-navy px-2.5 py-1 font-semibold text-paper">
              {listing.transactionType === "sale" ? "Vente" : "Location"}
            </span>
            <span className="rounded-full bg-paper-2 px-2.5 py-1 text-ink-2">
              {PROPERTY_LABEL[listing.propertyType]}
            </span>
            {listing.fokontany && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gold-tint px-2.5 py-1 font-medium text-gold-700">
                <Ico name="pin" size={12} /> {listing.fokontany}
              </span>
            )}
          </div>

          <h1 className="mt-3 font-display text-3xl font-semibold text-navy">
            {listing.title}
          </h1>
          <p className="mt-1 text-ink-2">{listing.address}</p>

          <div className="mt-4 flex items-end gap-3">
            <p className="tnum font-display text-3xl font-semibold text-navy">
              {priceLabel}
            </p>
            {listing.pricePerSqm != null && (
              <p className="tnum pb-1 text-sm text-muted">
                {Math.round(listing.pricePerSqm / 1000)}k Ar/m²
              </p>
            )}
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
            <Stat icon="ruler" label="Surface" value={`${listing.surfaceM2} m²`} />
            <Stat icon="house" label="Pièces" value={String(listing.rooms)} />
            {listing.bedrooms !== null && (
              <Stat
                icon="bed"
                label="Chambres"
                value={String(listing.bedrooms)}
              />
            )}
            {listing.bathrooms !== null && (
              <Stat
                icon="drop"
                label="Salles de bain"
                value={String(listing.bathrooms)}
              />
            )}
          </dl>

          {/* Amenities — present + absent (DESIGN §4.5) */}
          <h2 className="mt-8 font-display text-xl font-semibold text-navy">
            Équipements
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {AMENITIES.map((a) => (
              <AmenityTag key={a} amenity={a} present={amenitySet.has(a)} />
            ))}
          </div>

          <h2 className="mt-8 font-display text-xl font-semibold text-navy">
            Description
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-ink-2">
            {listing.description}
          </p>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          {listing.confidenceScore != null && (
            <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
              <ConfidenceBar
                score={listing.confidenceScore}
                breakdown={breakdown}
              />
            </div>
          )}

          {realCost && <RealCostEstimator cost={realCost} />}

          {sources.length > 0 && (
            <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
              <h3 className="flex items-center gap-1.5 font-display text-base font-semibold text-navy">
                <Ico name="layers" size={16} />
                {sources.length > 1
                  ? `Vu sur ${sources.length} plateformes`
                  : "Source"}
              </h3>
              <ul className="mt-2 space-y-1 text-sm">
                {sources.map((s, i) => (
                  <li key={`${s.source}-${i}`}>
                    {s.url ? (
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-navy-600 hover:text-navy hover:underline"
                      >
                        {SOURCE_LABEL[s.source] ?? s.source} ↗
                      </a>
                    ) : (
                      <span className="text-ink-2">
                        {SOURCE_LABEL[s.source] ?? s.source}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            type="button"
            className="w-full rounded-full bg-gold px-4 py-3 font-semibold text-navy transition hover:bg-gold-700"
          >
            Contacter le conseiller
          </button>
        </aside>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: Parameters<typeof Ico>[0]["name"];
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1 text-xs text-muted">
        <Ico name={icon} size={13} /> {label}
      </dt>
      <dd className="tnum mt-0.5 font-medium text-ink">{value}</dd>
    </div>
  );
}
