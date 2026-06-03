import { formatPrice } from "@/lib/format";
import { decodeHtmlEntities } from "@/lib/listing-location";
import { PROPERTY_LABEL, sourceLabel } from "@/lib/moderation-labels";
import ModerationActions from "./ModerationActions";
import ModerationMapLink from "./ModerationMapLink";
import ModerationPhoto from "./ModerationPhoto";
import Ico from "@/components/immo/Ico";

export type ModerationListing = {
  id: string;
  title: string;
  description: string;
  source: string;
  externalUrl: string | null;
  transactionType: "sale" | "rent";
  propertyType: string;
  price: number;
  address: string;
  fokontany: string | null;
  lng: number;
  lat: number;
  surfaceM2: number;
  rooms: number;
  scrapedAt: Date | null;
  photos: string[];
};

function formatScrapedAt(d: Date | null): string {
  if (!d) return "";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export default function ModerationListingCard({
  listing,
}: {
  listing: ModerationListing;
}) {
  const title = decodeHtmlEntities(listing.title);
  const description = decodeHtmlEntities(listing.description);
  const locationOk = Boolean(listing.fokontany);
  const surfaceOk = listing.surfaceM2 > 1;
  const roomsOk = listing.rooms > 0;

  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
      <div className="flex flex-col lg:flex-row">
        <div className="relative aspect-[4/3] shrink-0 bg-paper-2 lg:aspect-auto lg:w-[220px] lg:min-h-[200px]">
          <ModerationPhoto src={listing.photos[0] ?? ""} />
          <span className="absolute left-3 top-3 rounded-full bg-navy/90 px-2.5 py-1 text-[11px] font-semibold text-paper backdrop-blur">
            {listing.transactionType === "sale" ? "Vente" : "Location"}
          </span>
          <span className="absolute right-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-navy shadow">
            {sourceLabel(listing.source)}
          </span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-col gap-4 border-line p-4 sm:flex-row sm:items-start lg:border-l">
            <div className="min-w-0 flex-1 space-y-3">
          <div>
            <h2 className="font-display text-lg font-semibold leading-snug text-navy">
              {title}
            </h2>
            <p className="mt-1 text-sm text-ink-2">{listing.address}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <MetaChip
              ok={locationOk}
              label={
                locationOk
                  ? listing.fokontany!
                  : "Quartier à recalculer à l'approbation"
              }
            />
            <MetaChip
              ok={surfaceOk}
              label={
                surfaceOk
                  ? `${listing.surfaceM2} m²`
                  : "Surface non renseignée"
              }
            />
            <MetaChip
              ok={roomsOk}
              label={
                roomsOk ? `${listing.rooms} pièces` : "Pièces non renseignées"
              }
            />
            <span className="rounded-full bg-paper-2 px-2.5 py-1 text-[11px] font-medium text-ink-2">
              {PROPERTY_LABEL[listing.propertyType] ?? listing.propertyType}
            </span>
          </div>

          <p className="font-display text-xl font-semibold text-navy">
            {formatPrice(listing.price, listing.transactionType)}
          </p>

          {listing.scrapedAt ? (
            <p className="text-[11px] text-muted">
              Importé le {formatScrapedAt(listing.scrapedAt)}
            </p>
          ) : null}

          {listing.externalUrl ? (
            <a
              href={listing.externalUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="focus-gold inline-flex items-center gap-1 text-xs font-semibold text-navy underline-offset-2 hover:underline"
            >
              Voir l&apos;annonce source
              <Ico name="send" size={12} className="rotate-[-45deg]" />
            </a>
          ) : null}

          <details className="group rounded-xl border border-line bg-paper/60">
            <summary className="cursor-pointer list-none px-3 py-2 text-xs font-semibold text-ink-2 marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-1">
                Description
                <span className="text-muted transition group-open:rotate-180">
                  ▼
                </span>
              </span>
            </summary>
            <p className="border-t border-line px-3 py-3 text-sm leading-relaxed text-ink-2">
              {description}
            </p>
          </details>
            </div>

            <ModerationActions id={listing.id} />
          </div>

          <div className="border-t border-line bg-paper-2/80 p-3">
            <div className="grid gap-3 md:grid-cols-[minmax(0,220px)_1fr] md:items-center">
              <ModerationMapLink
                listingId={listing.id}
                lat={listing.lat}
                lng={listing.lng}
                fokontany={listing.fokontany}
              />
              <p className="text-xs leading-relaxed text-ink-2">
                Vérifiez le quartier sur la mini-carte avant d&apos;approuver. La
                position finale est recalculée depuis le titre (repères Paon
                d&apos;Or, Antanetibe, etc.).
              </p>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function MetaChip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
        ok ? "bg-present-bg text-present" : "bg-absent-bg text-absent"
      }`}
    >
      {label}
    </span>
  );
}
