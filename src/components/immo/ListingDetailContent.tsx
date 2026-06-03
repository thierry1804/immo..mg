"use client";

import { useState } from "react";
import type { ListingDetail } from "@/lib/listing-detail";
import { formatPrice } from "@/lib/format";
import { AMENITIES } from "@/lib/amenities";
import AmenityTag from "./AmenityTag";
import Ico from "./Ico";
import PhotoLightbox from "./PhotoLightbox";

const PROPERTY_LABEL: Record<string, string> = {
  house: "Maison",
  apartment: "Appartement",
  land: "Terrain",
  commercial: "Local commercial",
  other: "Autre",
};

export default function ListingDetailContent({
  listing,
}: {
  listing: ListingDetail;
}) {
  const [lightbox, setLightbox] = useState<number | null>(null);
  const priceLabel = formatPrice(listing.price, listing.transactionType);
  const amenitySet = new Set(listing.amenities);
  const photoPaths = listing.photos.map((p) => p.path);

  return (
    <>
      <div className="overflow-hidden rounded-3xl">
        {photoPaths.length > 0 ? (
          <div className="grid grid-cols-2 gap-1 md:grid-cols-4">
            <button
              type="button"
              className="col-span-2 row-span-2 aspect-[4/3] cursor-zoom-in md:aspect-auto"
              onClick={() => setLightbox(0)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoPaths[0]}
                alt=""
                className="h-full w-full object-cover"
              />
            </button>
            {photoPaths.slice(1, 5).map((path, i) => (
              <button
                key={path}
                type="button"
                className="aspect-[4/3] cursor-zoom-in"
                onClick={() => setLightbox(i + 1)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={path} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        ) : (
          <div className="ph grid aspect-[16/7] w-full place-items-center text-sm">
            immo·mg — photo indisponible
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
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

      <h1 className="mt-3 font-display text-2xl font-semibold text-navy md:text-3xl">
        {listing.title}
      </h1>
      <p className="mt-1 text-ink-2">{listing.address}</p>

      <div className="mt-4 flex items-end gap-3">
        <p className="tnum font-display text-2xl font-semibold text-navy md:text-3xl">
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
          <Stat icon="bed" label="Chambres" value={String(listing.bedrooms)} />
        )}
        {listing.bathrooms !== null && (
          <Stat icon="drop" label="Salles de bain" value={String(listing.bathrooms)} />
        )}
      </dl>

      <h2 className="mt-6 font-display text-lg font-semibold text-navy">
        Équipements
      </h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {AMENITIES.map((a) => (
          <AmenityTag key={a} amenity={a} present={amenitySet.has(a)} />
        ))}
      </div>

      <h2 className="mt-6 font-display text-lg font-semibold text-navy">
        Description
      </h2>
      <p className="mt-2 whitespace-pre-wrap text-sm text-ink-2">
        {listing.description}
      </p>

      {lightbox !== null && (
        <PhotoLightbox
          photos={photoPaths}
          initialIndex={lightbox}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
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
