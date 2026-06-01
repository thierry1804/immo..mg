"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export type SourceFormValues = {
  slug: string;
  name: string;
  enabled: boolean;
  baseUrl: string;
  listUrls: string;
  cardSelector: string;
  linkSelector: string;
  titleSelector: string;
  priceSelector: string;
  addressSelector: string;
  imageSelector: string;
  defaultTransactionType: "" | "sale" | "rent";
  maxPages: string;
  throttleMs: string;
};

export const emptySourceForm: SourceFormValues = {
  slug: "",
  name: "",
  enabled: true,
  baseUrl: "",
  listUrls: "",
  cardSelector: "",
  linkSelector: "a",
  titleSelector: "",
  priceSelector: "",
  addressSelector: "",
  imageSelector: "img",
  defaultTransactionType: "",
  maxPages: "1",
  throttleMs: "2000",
};

type Props = {
  initial?: SourceFormValues;
  sourceId?: string;
};

type ZodIssue = { path?: (string | number)[]; message?: string };

function formatErr(data: { error?: string; issues?: ZodIssue[] }): string {
  if (Array.isArray(data?.issues) && data.issues.length > 0) {
    return data.issues
      .map((iss) => `${iss.path?.join(".") || "?"}: ${iss.message ?? ""}`)
      .join(" · ");
  }
  return data?.error ?? "Échec";
}

export default function SourceForm({ initial, sourceId }: Props) {
  const router = useRouter();
  const [state, setState] = useState<SourceFormValues>(
    initial ?? emptySourceForm,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function update<K extends keyof SourceFormValues>(
    key: K,
    value: SourceFormValues[K],
  ) {
    setState((s) => ({ ...s, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const payload = {
        slug: state.slug.trim(),
        name: state.name.trim(),
        enabled: state.enabled,
        baseUrl: state.baseUrl.trim(),
        listUrls: state.listUrls
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        selectors: {
          card: state.cardSelector.trim(),
          link: state.linkSelector.trim(),
          title: state.titleSelector.trim(),
          price: state.priceSelector.trim(),
          address: state.addressSelector.trim(),
          image: state.imageSelector.trim() || null,
        },
        defaultTransactionType: state.defaultTransactionType || null,
        maxPages: Number(state.maxPages),
        throttleMs: Number(state.throttleMs),
      };
      const url = sourceId ? `/api/admin/sources/${sourceId}` : "/api/admin/sources";
      const res = await fetch(url, {
        method: sourceId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(formatErr(data));
        return;
      }
      router.push("/admin/sources");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Nom affiché">
          <input
            required
            value={state.name}
            onChange={(e) => update("name", e.target.value)}
            className="input"
            placeholder="Ex: AnnoncesMada"
          />
        </Field>
        <Field label="Slug (id technique)">
          <input
            required
            value={state.slug}
            onChange={(e) =>
              update(
                "slug",
                e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
              )
            }
            className="input"
            placeholder="ex: annoncesmada"
          />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={state.enabled}
          onChange={(e) => update("enabled", e.target.checked)}
        />
        Activer cette source
      </label>

      <Field label="URL racine du site (baseUrl)">
        <input
          required
          type="url"
          value={state.baseUrl}
          onChange={(e) => update("baseUrl", e.target.value)}
          className="input"
          placeholder="https://example.mg"
        />
      </Field>

      <Field label="Pages d'index à crawler (une URL par ligne)">
        <textarea
          required
          rows={3}
          value={state.listUrls}
          onChange={(e) => update("listUrls", e.target.value)}
          className="input"
          placeholder={
            "https://example.mg/categorie/immobilier\nhttps://example.mg/categorie/location"
          }
        />
      </Field>

      <fieldset className="rounded border border-zinc-200 p-4">
        <legend className="px-2 text-sm font-medium text-zinc-700">
          Sélecteurs CSS (inspectez le HTML d&apos;une page d&apos;index)
        </legend>
        <p className="mb-3 text-xs text-zinc-500">
          Tous ces sélecteurs sont appliqués à chaque carte annonce. Les
          sélecteurs relatifs à la carte cherchent les éléments à l&apos;intérieur.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Sélecteur de carte (chaque annonce)">
            <input
              required
              value={state.cardSelector}
              onChange={(e) => update("cardSelector", e.target.value)}
              className="input"
              placeholder=".listing, article.ad-card, li.result"
            />
          </Field>
          <Field label="Sélecteur du lien détail (dans la carte)">
            <input
              required
              value={state.linkSelector}
              onChange={(e) => update("linkSelector", e.target.value)}
              className="input"
              placeholder="a, a.card-link"
            />
          </Field>
          <Field label="Sélecteur du titre">
            <input
              required
              value={state.titleSelector}
              onChange={(e) => update("titleSelector", e.target.value)}
              className="input"
              placeholder="h2, .title"
            />
          </Field>
          <Field label="Sélecteur du prix">
            <input
              required
              value={state.priceSelector}
              onChange={(e) => update("priceSelector", e.target.value)}
              className="input"
              placeholder=".price"
            />
          </Field>
          <Field label="Sélecteur de l'adresse / localisation">
            <input
              required
              value={state.addressSelector}
              onChange={(e) => update("addressSelector", e.target.value)}
              className="input"
              placeholder=".location, .address"
            />
          </Field>
          <Field label="Sélecteur de la miniature (optionnel)">
            <input
              value={state.imageSelector}
              onChange={(e) => update("imageSelector", e.target.value)}
              className="input"
              placeholder="img"
            />
          </Field>
        </div>
      </fieldset>

      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Type de transaction par défaut">
          <select
            value={state.defaultTransactionType}
            onChange={(e) =>
              update(
                "defaultTransactionType",
                e.target.value as "" | "sale" | "rent",
              )
            }
            className="input"
          >
            <option value="">Auto (détection par mots-clés)</option>
            <option value="sale">Vente</option>
            <option value="rent">Location</option>
          </select>
        </Field>
        <Field label="Pages max par URL d'index">
          <input
            type="number"
            min={1}
            max={20}
            value={state.maxPages}
            onChange={(e) => update("maxPages", e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Délai entre requêtes (ms)">
          <input
            type="number"
            min={500}
            max={60000}
            step={500}
            value={state.throttleMs}
            onChange={(e) => update("throttleMs", e.target.value)}
            className="input"
          />
        </Field>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-zinc-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {pending
            ? "Enregistrement..."
            : sourceId
              ? "Enregistrer les modifications"
              : "Créer la source"}
        </button>
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
