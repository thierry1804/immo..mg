import { AMENITY_LABELS, type Amenity } from "@/lib/amenities";
import Ico, { type IcoName } from "./Ico";

/** Single-stroke icon per premium amenity (DESIGN §4.5 / §5). */
const AMENITY_ICONS: Record<Amenity, IcoName> = {
  guard: "shield",
  generator: "bolt",
  cistern: "drop",
  parking: "car",
  gated: "gate",
  paved: "road",
  ac: "snow",
  fiber: "wifi",
  pool: "wave",
};

type Props = {
  amenity: Amenity;
  /** When false, renders as an "absent" chip (amber, muted). */
  present?: boolean;
  size?: "sm" | "md";
};

/**
 * A premium-amenity chip. Present amenities read green with a check; absent ones
 * read amber and muted — never an alarming red (DESIGN §2 semantic colors).
 */
export default function AmenityTag({
  amenity,
  present = true,
  size = "md",
}: Props) {
  const pad = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";
  const tone = present
    ? "bg-present-bg text-present"
    : "bg-absent-bg text-absent opacity-90";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${pad} ${tone}`}
      title={AMENITY_LABELS[amenity]}
    >
      <Ico name={AMENITY_ICONS[amenity]} size={size === "sm" ? 13 : 14} />
      {AMENITY_LABELS[amenity]}
    </span>
  );
}
