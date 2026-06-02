"use client";

import { useEffect, useState } from "react";
import { AMENITIES, AMENITY_LABELS, type Amenity } from "@/lib/amenities";
import { FOKONTANY } from "@/lib/fokontany";

const PROPERTY_TYPES: { key: string; label: string }[] = [
  { key: "apartment", label: "Appartement" },
  { key: "house", label: "Maison" },
  { key: "land", label: "Terrain" },
  { key: "commercial", label: "Commercial" },
  { key: "other", label: "Autre" },
];

type Profile = {
  budgetMin: number | null;
  budgetMax: number | null;
  transactionType: "sale" | "rent" | null;
  quartiers: string[];
  mustHave: string[];
  propertyTypes: string[];
  minSurface: number | null;
  alertThreshold: number;
};

const EMPTY: Profile = {
  budgetMin: null,
  budgetMax: null,
  transactionType: null,
  quartiers: [],
  mustHave: [],
  propertyTypes: [],
  minSurface: null,
  alertThreshold: 80,
};

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

export default function PreferencesForm() {
  const [p, setP] = useState<Profile>(EMPTY);
  const [status, setStatus] = useState<"loading" | "idle" | "saving" | "saved">(
    "loading",
  );

  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((d: { profile: Profile | null }) => {
        if (d.profile) setP({ ...EMPTY, ...d.profile });
        setStatus("idle");
      })
      .catch(() => setStatus("idle"));
  }, []);

  async function save() {
    setStatus("saving");
    try {
      await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p),
      });
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("idle");
    }
  }

  if (status === "loading") {
    return <p className="py-10 text-center text-sm text-muted">Chargement…</p>;
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      className="space-y-8"
    >
      <Section
        title="Transaction"
        hint="Le type de projet oriente toute la compatibilité."
      >
        <div className="inline-flex rounded-full border border-line bg-white p-0.5">
          {[
            { key: null, label: "Indifférent" },
            { key: "rent", label: "Location" },
            { key: "sale", label: "Achat" },
          ].map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={() =>
                setP({ ...p, transactionType: t.key as Profile["transactionType"] })
              }
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                p.transactionType === t.key
                  ? "bg-navy text-paper"
                  : "text-ink-2 hover:text-navy"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Budget (Ar)" hint="Une annonce sous votre maximum reste compatible.">
        <div className="flex flex-wrap gap-3">
          <NumField
            label="Minimum"
            value={p.budgetMin}
            onChange={(v) => setP({ ...p, budgetMin: v })}
          />
          <NumField
            label="Maximum"
            value={p.budgetMax}
            onChange={(v) => setP({ ...p, budgetMax: v })}
          />
        </div>
      </Section>

      <Section title="Quartiers préférés">
        <ChipGroup
          options={FOKONTANY.map((f) => ({ key: f.name, label: f.name }))}
          selected={p.quartiers}
          onToggle={(k) => setP({ ...p, quartiers: toggle(p.quartiers, k) })}
        />
      </Section>

      <Section title="Équipements indispensables">
        <ChipGroup
          options={AMENITIES.map((a) => ({
            key: a,
            label: AMENITY_LABELS[a as Amenity],
          }))}
          selected={p.mustHave}
          onToggle={(k) => setP({ ...p, mustHave: toggle(p.mustHave, k) })}
        />
      </Section>

      <Section title="Types de bien">
        <ChipGroup
          options={PROPERTY_TYPES}
          selected={p.propertyTypes}
          onToggle={(k) =>
            setP({ ...p, propertyTypes: toggle(p.propertyTypes, k) })
          }
        />
      </Section>

      <Section title="Surface minimale (m²)">
        <NumField
          label="m²"
          value={p.minSurface}
          onChange={(v) => setP({ ...p, minSurface: v })}
        />
      </Section>

      <Section
        title={`Seuil d'alerte : ${p.alertThreshold}%`}
        hint="Compatibilité minimale pour être notifié d'un nouveau bien."
      >
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={p.alertThreshold}
          onChange={(e) =>
            setP({ ...p, alertThreshold: Number(e.target.value) })
          }
          className="w-full max-w-sm accent-[var(--gold)]"
        />
      </Section>

      <div className="flex items-center gap-3 border-t border-line pt-5">
        <button
          type="submit"
          disabled={status === "saving"}
          className="rounded-full bg-gold px-6 py-2.5 font-semibold text-navy transition hover:bg-gold-700 disabled:opacity-60"
        >
          {status === "saving" ? "Enregistrement…" : "Enregistrer"}
        </button>
        {status === "saved" && (
          <span className="text-sm font-medium text-present">
            Préférences enregistrées ✓
          </span>
        )}
      </div>
    </form>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="font-display text-lg font-semibold text-navy">{title}</h2>
      {hint && <p className="mb-2 mt-0.5 text-xs text-muted">{hint}</p>}
      <div className="mt-2">{children}</div>
    </div>
  );
}

function ChipGroup({
  options,
  selected,
  onToggle,
}: {
  options: { key: string; label: string }[];
  selected: string[];
  onToggle: (key: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = selected.includes(o.key);
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onToggle(o.key)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
              active
                ? "border-gold bg-gold-tint text-gold-700"
                : "border-line bg-white text-ink-2 hover:border-navy-300"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <label className="block text-xs">
      <span className="mb-1 block font-medium text-ink-2">{label}</span>
      <input
        type="number"
        min={0}
        value={value ?? ""}
        onChange={(e) =>
          onChange(e.target.value === "" ? null : Number(e.target.value))
        }
        className="input w-40"
      />
    </label>
  );
}
