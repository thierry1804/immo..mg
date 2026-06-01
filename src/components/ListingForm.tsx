"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import PhotoUploader from "./PhotoUploader";

const Map = dynamic(() => import("./Map"), { ssr: false });

type FormState = {
  title: string;
  description: string;
  transactionType: "sale" | "rent";
  propertyType: "house" | "apartment" | "land" | "commercial" | "other";
  price: string;
  address: string;
  surfaceM2: string;
  rooms: string;
  bedrooms: string;
  bathrooms: string;
};

const empty: FormState = {
  title: "",
  description: "",
  transactionType: "sale",
  propertyType: "apartment",
  price: "",
  address: "",
  surfaceM2: "",
  rooms: "",
  bedrooms: "",
  bathrooms: "",
};

function toOptionalInt(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

const FIELD_LABELS: Record<string, string> = {
  title: "Titre",
  description: "Description",
  transactionType: "Type de transaction",
  propertyType: "Type de bien",
  price: "Prix",
  address: "Adresse",
  lng: "Position (lng)",
  lat: "Position (lat)",
  surfaceM2: "Surface",
  rooms: "Pièces",
  bedrooms: "Chambres",
  bathrooms: "Salles de bain",
  photoPaths: "Photos",
};

type ZodIssue = { path?: (string | number)[]; message?: string };

function formatApiError(data: { error?: string; issues?: ZodIssue[] }): string {
  if (Array.isArray(data?.issues) && data.issues.length > 0) {
    return data.issues
      .map((iss) => {
        const key = iss.path?.[0]?.toString() ?? "";
        const label = FIELD_LABELS[key] ?? key ?? "Champ";
        return `${label} : ${iss.message ?? "invalide"}`;
      })
      .join(" · ");
  }
  return data?.error ?? "Création échouée";
}

export default function ListingForm() {
  const router = useRouter();
  const [state, setState] = useState<FormState>(empty);
  const [position, setPosition] = useState<{ lng: number; lat: number } | null>(
    null,
  );
  const [photoPaths, setPhotoPaths] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  const reverseAbortRef = useRef<AbortController | null>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  const handlePick = useCallback(
    (coords: { lng: number; lat: number }) => {
      setPosition(coords);
      reverseAbortRef.current?.abort();
      const ac = new AbortController();
      reverseAbortRef.current = ac;
      setAddressLoading(true);
      fetch(
        `/api/geocode/reverse?lng=${coords.lng}&lat=${coords.lat}`,
        { signal: ac.signal },
      )
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { address: string | null } | null) => {
          if (ac.signal.aborted) return;
          if (data?.address) {
            setState((s) => ({ ...s, address: data.address as string }));
          }
        })
        .catch(() => {
          /* aborted or network error: keep current address */
        })
        .finally(() => {
          if (!ac.signal.aborted) setAddressLoading(false);
        });
    },
    [],
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!position) {
      setError("Cliquez sur la carte pour placer le bien.");
      return;
    }
    setPending(true);
    try {
      const payload = {
        title: state.title,
        description: state.description,
        transactionType: state.transactionType,
        propertyType: state.propertyType,
        price: Number(state.price),
        address: state.address,
        lng: position.lng,
        lat: position.lat,
        surfaceM2: Number(state.surfaceM2),
        rooms: Number(state.rooms),
        bedrooms: toOptionalInt(state.bedrooms),
        bathrooms: toOptionalInt(state.bathrooms),
        photoPaths,
      };
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(formatApiError(data));
        return;
      }
      const data = (await res.json()) as { id: string };
      router.push(`/listings/${data.id}`);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-6 md:grid-cols-2">
      <div className="space-y-4">
        <Field label="Titre">
          <input
            required
            value={state.title}
            onChange={(e) => update("title", e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Description">
          <textarea
            required
            rows={5}
            value={state.description}
            onChange={(e) => update("description", e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Adresse">
          <input
            required
            value={state.address}
            onChange={(e) => update("address", e.target.value)}
            className="input"
            placeholder={
              addressLoading
                ? "Résolution de l'adresse…"
                : "Cliquez sur la carte ou saisissez l'adresse"
            }
          />
          {addressLoading && (
            <span className="mt-1 block text-xs text-zinc-500">
              Résolution de l&apos;adresse via OpenStreetMap…
            </span>
          )}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Transaction">
            <select
              value={state.transactionType}
              onChange={(e) =>
                update(
                  "transactionType",
                  e.target.value as FormState["transactionType"],
                )
              }
              className="input"
            >
              <option value="sale">Vente</option>
              <option value="rent">Location</option>
            </select>
          </Field>
          <Field label="Type de bien">
            <select
              value={state.propertyType}
              onChange={(e) =>
                update(
                  "propertyType",
                  e.target.value as FormState["propertyType"],
                )
              }
              className="input"
            >
              <option value="apartment">Appartement</option>
              <option value="house">Maison</option>
              <option value="land">Terrain</option>
              <option value="commercial">Local commercial</option>
              <option value="other">Autre</option>
            </select>
          </Field>
          <Field
            label={
              state.transactionType === "rent"
                ? "Loyer mensuel (Ar)"
                : "Prix (Ar)"
            }
          >
            <input
              required
              type="number"
              min={0}
              value={state.price}
              onChange={(e) => update("price", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Surface (m²)">
            <input
              required
              type="number"
              min={1}
              value={state.surfaceM2}
              onChange={(e) => update("surfaceM2", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Pièces">
            <input
              required
              type="number"
              min={0}
              value={state.rooms}
              onChange={(e) => update("rooms", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Chambres">
            <input
              type="number"
              min={0}
              value={state.bedrooms}
              onChange={(e) => update("bedrooms", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Salles de bain">
            <input
              type="number"
              min={0}
              value={state.bathrooms}
              onChange={(e) => update("bathrooms", e.target.value)}
              className="input"
            />
          </Field>
        </div>
        <PhotoUploader paths={photoPaths} onChange={setPhotoPaths} />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-zinc-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {pending ? "Publication..." : "Publier l'annonce"}
        </button>
      </div>

      <div>
        <p className="mb-2 text-sm text-zinc-600">
          Cliquez sur la carte pour placer le bien. Vous pouvez ensuite
          glisser-déposer le marqueur.
        </p>
        <Map
          className="h-[480px] w-full rounded border"
          picker={position}
          onPick={handlePick}
        />
        {position && (
          <p className="mt-2 text-xs text-zinc-500">
            {position.lat.toFixed(5)}, {position.lng.toFixed(5)}
          </p>
        )}
      </div>
    </form>
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
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-zinc-800">{label}</span>
      {children}
    </label>
  );
}
