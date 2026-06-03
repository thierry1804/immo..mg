import Link from "next/link";
import { notFound } from "next/navigation";
import ListingDetailContent from "@/components/immo/ListingDetailContent";
import ListingDetailSidebar from "@/components/immo/ListingDetailSidebar";
import Ico from "@/components/immo/Ico";
import { fetchListingDetail } from "@/lib/listing-detail";

export default async function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listing = await fetchListingDetail(id);
  if (!listing) notFound();

  const listingUrl = `/listings/${id}`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-navy"
      >
        <Ico name="pin" size={14} /> Retour à la carte
      </Link>

      <div className="mt-4">
        <ListingDetailContent listing={listing} />
      </div>

      <div className="mt-6 md:max-w-sm">
        <ListingDetailSidebar listing={listing} listingUrl={listingUrl} />
      </div>
    </div>
  );
}
