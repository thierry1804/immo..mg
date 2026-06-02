"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AMENITY_LABELS, type Amenity } from "@/lib/amenities";
import { formatAriary, formatPrice } from "@/lib/format";
import { useCompare } from "@/lib/use-compare";
import AmenityTag from "./AmenityTag";
import Ico from "./Ico";

type Item = {
  id: string;
  title: string;
  price: number;
  transactionType: "sale" | "rent";
  propertyType: string;
  fokontany: string | null;
  amenities: Amenity[];
  confidenceScore: number | null;
  pricePerSqm: number | null;
  estimatedRealCost: number | null;
  surfaceM2: number;
  rooms: number;
  sourceCount: number;
  compatibility: number | null;
};

const PROPERTY_LABEL: Record<string, string> = {
  house: "Maison",
  apartment: "Appartement",
  land: "Terrain",
  commercial: "Commercial",
  other: "Autre",
};

/** Index of the best value in `vals` (null entries ignored); -1 if no winner. */
function bestIndex(vals: (number | null)[], dir: "min" | "max"): number {
  let bi = -1;
  let bv: number | null = null;
  vals.forEach((v, i) => {
    if (v == null) return;
    if (bv == null || (dir === "max" ? v > bv : v < bv)) {
      bv = v;
      bi = i;
    }
  });
  // No highlight when every present value ties.
  const present = vals.filter((v): v is number => v != null);
  if (present.length > 1 && present.every((v) => v === present[0])) return -1;
  return bi;
}

export default function CompareScreen() {
  const fromUrl = useSearchParams().get("ids");
  const { remove } = useCompare();
  const [items, setItems] = useState<Item[] | null>(null);

  useEffect(() => {
    const ids = (fromUrl ?? "").split(",").filter(Boolean).slice(0, 3);
    if (ids.length === 0) {
      setItems([]);
      return;
    }
    fetch(`/api/listings/compare?ids=${ids.join(",")}`)
      .then((r) => r.json())
      .then((d: { listings: Item[] }) => setItems(d.listings ?? []))
      .catch(() => setItems([]));
  }, [fromUrl]);

  if (items === null) {
    return <p className="py-12 text-center text-sm text-muted">Chargement…</p>;
  }
  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-ink-2">Aucun bien à comparer.</p>
        <Link href="/" className="mt-3 inline-block text-navy-600 hover:underline">
          ← Parcourir les biens
        </Link>
      </div>
    );
  }

  const best = {
    price: bestIndex(items.map((i) => i.price), "min"),
    ppsqm: bestIndex(items.map((i) => i.pricePerSqm), "min"),
    surface: bestIndex(items.map((i) => i.surfaceM2), "max"),
    rooms: bestIndex(items.map((i) => i.rooms), "max"),
    confidence: bestIndex(items.map((i) => i.confidenceScore), "max"),
    compat: bestIndex(items.map((i) => i.compatibility), "max"),
    realCost: bestIndex(items.map((i) => i.estimatedRealCost), "min"),
    amenities: bestIndex(items.map((i) => i.amenities.length), "max"),
    sources: bestIndex(items.map((i) => i.sourceCount), "max"),
  };

  const cell = (winner: boolean) =>
    `px-4 py-3 align-top ${winner ? "bg-gold-tint font-semibold text-navy" : ""}`;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr>
            <th className="w-36 px-4 py-3" />
            {items.map((it) => (
              <th key={it.id} className="px-4 py-3 text-left align-bottom">
                <Link
                  href={`/listings/${it.id}`}
                  className="font-display text-base font-semibold text-navy hover:underline"
                >
                  {it.title}
                </Link>
                <button
                  type="button"
                  onClick={() => remove(it.id)}
                  className="mt-1 block text-xs text-muted hover:text-navy"
                >
                  Retirer
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          <Row label="Prix">
            {items.map((it, i) => (
              <td key={it.id} className={cell(best.price === i)}>
                {formatPrice(it.price, it.transactionType)}
              </td>
            ))}
          </Row>
          <Row label="Prix / m²">
            {items.map((it, i) => (
              <td key={it.id} className={cell(best.ppsqm === i)}>
                {it.pricePerSqm != null
                  ? `${formatAriary(Math.round(it.pricePerSqm))}/m²`
                  : "—"}
              </td>
            ))}
          </Row>
          <Row label="Coût réel / mois">
            {items.map((it, i) => (
              <td key={it.id} className={cell(best.realCost === i)}>
                {it.estimatedRealCost != null
                  ? formatAriary(it.estimatedRealCost)
                  : "—"}
              </td>
            ))}
          </Row>
          <Row label="Type">
            {items.map((it) => (
              <td key={it.id} className="px-4 py-3 align-top">
                {PROPERTY_LABEL[it.propertyType]}
              </td>
            ))}
          </Row>
          <Row label="Surface">
            {items.map((it, i) => (
              <td key={it.id} className={cell(best.surface === i)}>
                {it.surfaceM2} m²
              </td>
            ))}
          </Row>
          <Row label="Pièces">
            {items.map((it, i) => (
              <td key={it.id} className={cell(best.rooms === i)}>
                {it.rooms}
              </td>
            ))}
          </Row>
          <Row label="Quartier">
            {items.map((it) => (
              <td key={it.id} className="px-4 py-3 align-top">
                {it.fokontany ?? "—"}
              </td>
            ))}
          </Row>
          <Row label="Confiance">
            {items.map((it, i) => (
              <td key={it.id} className={cell(best.confidence === i)}>
                {it.confidenceScore != null ? `${it.confidenceScore}/100` : "—"}
              </td>
            ))}
          </Row>
          {items.some((it) => it.compatibility != null) && (
            <Row label="Compatibilité">
              {items.map((it, i) => (
                <td key={it.id} className={cell(best.compat === i)}>
                  {it.compatibility != null ? `${it.compatibility}%` : "—"}
                </td>
              ))}
            </Row>
          )}
          <Row label="Sources">
            {items.map((it, i) => (
              <td key={it.id} className={cell(best.sources === i)}>
                {it.sourceCount > 1 ? `${it.sourceCount} plateformes` : "1 source"}
              </td>
            ))}
          </Row>
          <Row label="Équipements">
            {items.map((it, i) => (
              <td key={it.id} className={cell(best.amenities === i)}>
                <div className="flex flex-wrap gap-1">
                  {it.amenities.length > 0
                    ? it.amenities.map((a) => (
                        <AmenityTag key={a} amenity={a} size="sm" />
                      ))
                    : "—"}
                </div>
                <span className="sr-only">
                  {it.amenities.map((a) => AMENITY_LABELS[a]).join(", ")}
                </span>
              </td>
            ))}
          </Row>
        </tbody>
      </table>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <tr>
      <th className="bg-paper-2/60 px-4 py-3 text-left align-top text-xs font-semibold uppercase tracking-wide text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Ico name="scale" size={13} /> {label}
        </span>
      </th>
      {children}
    </tr>
  );
}
