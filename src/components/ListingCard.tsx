import Link from "next/link";
import { formatPrice } from "@/lib/format";

const PROPERTY_LABEL: Record<string, string> = {
  house: "Maison",
  apartment: "Appartement",
  land: "Terrain",
  commercial: "Local commercial",
  other: "Autre",
};

export type ListingSummary = {
  id: string;
  title: string;
  price: number;
  transactionType: "sale" | "rent";
  propertyType: "house" | "apartment" | "land" | "commercial" | "other";
  address: string;
  surfaceM2: number;
  rooms: number;
};

export default function ListingCard({ listing }: { listing: ListingSummary }) {
  const priceLabel = formatPrice(listing.price, listing.transactionType);

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="block rounded border border-zinc-200 bg-white p-3 transition hover:border-zinc-400"
    >
      <p className="text-sm font-semibold text-zinc-900">{listing.title}</p>
      <p className="mt-0.5 truncate text-xs text-zinc-500">{listing.address}</p>
      <p className="mt-2 text-base font-semibold">{priceLabel}</p>
      <p className="mt-1 text-xs text-zinc-600">
        {PROPERTY_LABEL[listing.propertyType]} · {listing.surfaceM2} m² ·{" "}
        {listing.rooms} pcs
      </p>
    </Link>
  );
}
