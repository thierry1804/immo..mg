import Ico from "@/components/immo/Ico";
import ModerationMiniMap from "./ModerationMiniMap";

export default function ModerationMapLink({
  listingId,
  lat,
  lng,
  fokontany,
}: {
  listingId: string;
  lat: number;
  lng: number;
  fokontany: string | null;
}) {
  const href = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=16#map=16/${lat}/${lng}`;

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-paper-2">
      <ModerationMiniMap
        listingId={listingId}
        lat={lat}
        lng={lng}
        label={fokontany}
      />
      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className="focus-gold flex items-center justify-between gap-2 px-3 py-2 text-[11px] transition hover:bg-paper"
      >
        <span className="inline-flex items-center gap-1 font-medium text-navy">
          <Ico name="pin" size={12} className="text-gold-700" />
          {fokontany ?? "Position"}
        </span>
        <span className="font-mono text-ink-2">
          {lat.toFixed(4)}, {lng.toFixed(4)}
        </span>
      </a>
    </div>
  );
}
