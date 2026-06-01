"use client";

export type Filters = {
  txn?: "sale" | "rent";
  propertyType?: "house" | "apartment" | "land" | "commercial" | "other";
  minPrice?: number;
  maxPrice?: number;
  minSurface?: number;
  minRooms?: number;
};

type Props = {
  value: Filters;
  onChange: (next: Filters) => void;
};

export default function FiltersPanel({ value, onChange }: Props) {
  function update<K extends keyof Filters>(key: K, raw: string) {
    const next = { ...value };
    if (raw === "") {
      delete next[key];
    } else {
      const isNumeric =
        key === "minPrice" ||
        key === "maxPrice" ||
        key === "minSurface" ||
        key === "minRooms";
      if (isNumeric) {
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0) return;
        next[key] = n as Filters[K];
      } else {
        next[key] = raw as Filters[K];
      }
    }
    onChange(next);
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
      <Field label="Transaction">
        <select
          value={value.txn ?? ""}
          onChange={(e) => update("txn", e.target.value)}
          className="input"
        >
          <option value="">Toutes</option>
          <option value="sale">Vente</option>
          <option value="rent">Location</option>
        </select>
      </Field>
      <Field label="Type">
        <select
          value={value.propertyType ?? ""}
          onChange={(e) => update("propertyType", e.target.value)}
          className="input"
        >
          <option value="">Tous</option>
          <option value="apartment">Appartement</option>
          <option value="house">Maison</option>
          <option value="land">Terrain</option>
          <option value="commercial">Commercial</option>
          <option value="other">Autre</option>
        </select>
      </Field>
      <Field label="Prix min (Ar)">
        <input
          type="number"
          min={0}
          value={value.minPrice ?? ""}
          onChange={(e) => update("minPrice", e.target.value)}
          className="input"
        />
      </Field>
      <Field label="Prix max (Ar)">
        <input
          type="number"
          min={0}
          value={value.maxPrice ?? ""}
          onChange={(e) => update("maxPrice", e.target.value)}
          className="input"
        />
      </Field>
      <Field label="Surface min (m²)">
        <input
          type="number"
          min={0}
          value={value.minSurface ?? ""}
          onChange={(e) => update("minSurface", e.target.value)}
          className="input"
        />
      </Field>
      <Field label="Pièces min">
        <input
          type="number"
          min={0}
          value={value.minRooms ?? ""}
          onChange={(e) => update("minRooms", e.target.value)}
          className="input"
        />
      </Field>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-xs">
      <span className="mb-1 block font-medium text-zinc-700">{label}</span>
      {children}
    </label>
  );
}
