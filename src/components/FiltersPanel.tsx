"use client";

import { AMENITIES, AMENITY_LABELS, type Amenity } from "@/lib/amenities";
import {
  hasActiveFilters,
  type Filters,
  type SortKey,
} from "@/lib/search-filters";

export type { Filters, SortKey };

type Props = {
  value: Filters;
  onChange: (next: Filters) => void;
  onReset?: () => void;
};

const TXN: { key: Filters["txn"]; label: string }[] = [
  { key: undefined, label: "Tout" },
  { key: "sale", label: "Vente" },
  { key: "rent", label: "Location" },
];

const SORTS: { key: SortKey; label: string }[] = [
  { key: "relevance", label: "Pertinence" },
  { key: "compat", label: "Compatibilité" },
  { key: "price_asc", label: "Prix ↑" },
  { key: "price_desc", label: "Prix ↓" },
  { key: "surface", label: "Surface" },
  { key: "confidence", label: "Confiance" },
];

export default function FiltersPanel({ value, onChange, onReset }: Props) {
  function num(key: "minPrice" | "maxPrice" | "minSurface" | "minRooms", raw: string) {
    const next = { ...value };
    if (raw === "") delete next[key];
    else {
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0) return;
      next[key] = n;
    }
    onChange(next);
  }

  function toggleAmenity(a: Amenity) {
    const set = new Set(value.amenities ?? []);
    if (set.has(a)) set.delete(a);
    else set.add(a);
    onChange({ ...value, amenities: set.size ? [...set] : undefined });
  }

  return (
    <div className="space-y-3">
      {onReset && hasActiveFilters(value) ? (
        <button
          type="button"
          onClick={onReset}
          className="focus-gold text-xs font-semibold text-ink-2 underline-offset-2 hover:text-navy hover:underline"
        >
          Tout effacer
        </button>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        {/* Transaction segmented control */}
        <div className="inline-flex rounded-full border border-line bg-white p-0.5">
          {TXN.map((t) => {
            const active = value.txn === t.key;
            return (
              <button
                key={t.label}
                type="button"
                onClick={() => onChange({ ...value, txn: t.key })}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  active ? "bg-navy text-paper" : "text-ink-2 hover:text-navy"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <select
          value={value.propertyType ?? ""}
          onChange={(e) =>
            onChange({
              ...value,
              propertyType: (e.target.value || undefined) as Filters["propertyType"],
            })
          }
          className="input w-auto py-1 text-xs"
          aria-label="Type de bien"
        >
          <option value="">Tous types</option>
          <option value="apartment">Appartement</option>
          <option value="house">Maison</option>
          <option value="land">Terrain</option>
          <option value="commercial">Commercial</option>
          <option value="other">Autre</option>
        </select>

        <select
          value={value.sort ?? "relevance"}
          onChange={(e) =>
            onChange({ ...value, sort: e.target.value as SortKey })
          }
          className="input ml-auto w-auto py-1 text-xs"
          aria-label="Trier par"
        >
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>
              Trier : {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Quick numeric filters */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <NumInput
          placeholder="Prix min"
          value={value.minPrice}
          onChange={(v) => num("minPrice", v)}
        />
        <NumInput
          placeholder="Prix max"
          value={value.maxPrice}
          onChange={(v) => num("maxPrice", v)}
        />
        <NumInput
          placeholder="Surface min"
          value={value.minSurface}
          onChange={(v) => num("minSurface", v)}
        />
        <NumInput
          placeholder="Pièces min"
          value={value.minRooms}
          onChange={(v) => num("minRooms", v)}
        />
      </div>

      {/* Amenity chips */}
      <div className="flex flex-wrap gap-1.5">
        {AMENITIES.map((a) => {
          const active = (value.amenities ?? []).includes(a);
          return (
            <button
              key={a}
              type="button"
              onClick={() => toggleAmenity(a)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                active
                  ? "border-gold bg-gold-tint text-gold-700"
                  : "border-line bg-white text-ink-2 hover:border-navy-300"
              }`}
            >
              {AMENITY_LABELS[a]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function NumInput({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string;
  value: number | undefined;
  onChange: (raw: string) => void;
}) {
  return (
    <input
      type="number"
      min={0}
      placeholder={placeholder}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className="input w-28 py-1 text-xs"
    />
  );
}
