import Link from "next/link";
import type { Amenity } from "@/lib/amenities";
import { formatPrice } from "@/lib/format";
import AmenityTag from "./AmenityTag";
import CompatibilityRing from "./CompatibilityRing";
import ConfidenceBar from "./ConfidenceBar";
import Ico from "./Ico";

const PROPERTY_LABEL: Record<string, string> = {
  house: "Maison",
  apartment: "Appartement",
  land: "Terrain",
  commercial: "Local commercial",
  other: "Autre",
};

export type PropertySummary = {
  id: string;
  title: string;
  price: number;
  transactionType: "sale" | "rent";
  propertyType: "house" | "apartment" | "land" | "commercial" | "other";
  address: string;
  surfaceM2: number;
  rooms: number;
  fokontany: string | null;
  amenities: Amenity[];
  confidenceScore: number | null;
  pricePerSqm: number | null;
  sourceCount: number;
  photo: string | null;
  /** Declared-compatibility score 0–100 (M5); null when no profile. */
  compatibility?: number | null;
};

/**
 * Signature listing card (replaces the generic ListingCard). Photo or striped
 * placeholder, price + price/m², confidence bar, premium amenities, and the
 * "Vu sur N plateformes" multi-source badge. The top match is haloed gold.
 */
export default function PropertyCard({
  listing,
  topMatch = false,
}: {
  listing: PropertySummary;
  topMatch?: boolean;
}) {
  const priceLabel = formatPrice(listing.price, listing.transactionType);
  const shownAmenities = listing.amenities.slice(0, 4);

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="group block overflow-hidden rounded-2xl border border-line bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-22px_rgba(13,33,55,0.32)]"
      style={topMatch ? { boxShadow: "var(--shadow-top-match)" } : undefined}
    >
      <div className="relative aspect-[16/10] w-full">
        {listing.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.photo}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="ph grid h-full w-full place-items-center">
            immo·mg
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-navy/90 px-2.5 py-1 text-[11px] font-semibold text-paper backdrop-blur">
          {listing.transactionType === "sale" ? "Vente" : "Location"}
        </span>
        {topMatch && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-gold px-2.5 py-1 text-[11px] font-semibold text-navy">
            <Ico name="star" size={12} /> Top match
          </span>
        )}
        {listing.compatibility != null && (
          <div className="absolute -bottom-6 right-3 rounded-full bg-white p-1 shadow-card">
            <CompatibilityRing score={listing.compatibility} size={52} />
          </div>
        )}
      </div>

      <div className="space-y-2.5 p-4">
        <div>
          <p className="truncate font-display text-base font-semibold text-navy">
            {listing.title}
          </p>
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted">
            <Ico name="pin" size={12} />
            {listing.fokontany ?? listing.address}
          </p>
        </div>

        <div className="flex items-end justify-between">
          <p className="tnum font-display text-lg font-semibold text-navy">
            {priceLabel}
          </p>
          {listing.pricePerSqm != null && (
            <p className="tnum text-[11px] text-muted">
              {Math.round(listing.pricePerSqm / 1000)}k Ar/m²
            </p>
          )}
        </div>

        <p className="text-xs text-ink-2">
          {PROPERTY_LABEL[listing.propertyType]} · {listing.surfaceM2} m² ·{" "}
          {listing.rooms} pcs
        </p>

        {shownAmenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {shownAmenities.map((a) => (
              <AmenityTag key={a} amenity={a} size="sm" />
            ))}
          </div>
        )}

        {listing.confidenceScore != null && (
          <ConfidenceBar score={listing.confidenceScore} size="sm" />
        )}

        {listing.sourceCount >= 2 && (
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-gold-700">
            <Ico name="layers" size={13} />
            Vu sur {listing.sourceCount} plateformes
          </p>
        )}
      </div>
    </Link>
  );
}
