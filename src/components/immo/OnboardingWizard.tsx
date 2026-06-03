"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AMENITY_LABELS, type Amenity } from "@/lib/amenities";
import { FOKONTANY } from "@/lib/fokontany";
import Ico from "./Ico";

const PREMIUM: Amenity[] = [
  "guard",
  "generator",
  "gated",
  "pool",
  "fiber",
  "parking",
];

export default function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [quartiers, setQuartiers] = useState<string[]>([]);
  const [mustHave, setMustHave] = useState<Amenity[]>([]);
  const [busy, setBusy] = useState(false);

  async function finish() {
    setBusy(true);
    await fetch("/api/user/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        budgetMin: budgetMin ? Number(budgetMin) : null,
        budgetMax: budgetMax ? Number(budgetMax) : null,
        quartiers,
        mustHave,
        alertThreshold: 80,
      }),
    });
    setBusy(false);
    router.push("/");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6 h-2 overflow-hidden rounded-full bg-paper-2">
        <div
          className="h-full bg-gold transition-all"
          style={{ width: `${((step + 1) / 3) * 100}%` }}
        />
      </div>

      {step === 0 && (
        <section>
          <h2 className="font-display text-xl font-semibold text-navy">
            Votre budget
          </h2>
          <p className="mt-1 text-sm text-ink-2">En Ariary, mensuel ou total.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-muted">
              Minimum
              <input
                type="number"
                value={budgetMin}
                onChange={(e) => setBudgetMin(e.target.value)}
                className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs text-muted">
              Maximum
              <input
                type="number"
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
                className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={() => setStep(1)}
            className="mt-6 w-full rounded-full bg-navy py-3 font-semibold text-paper"
          >
            Suivant
          </button>
        </section>
      )}

      {step === 1 && (
        <section>
          <h2 className="font-display text-xl font-semibold text-navy">
            Quartiers préférés
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {FOKONTANY.map((f) => {
              const on = quartiers.includes(f.name);
              return (
                <button
                  key={f.name}
                  type="button"
                  onClick={() =>
                    setQuartiers((q) =>
                      on ? q.filter((x) => x !== f.name) : [...q, f.name],
                    )
                  }
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    on ? "bg-gold text-navy" : "bg-paper-2 text-ink-2"
                  }`}
                >
                  {f.name}
                </button>
              );
            })}
          </div>
          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={() => setStep(0)}
              className="flex-1 rounded-full border border-line py-3 text-sm"
            >
              Retour
            </button>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex-1 rounded-full bg-navy py-3 font-semibold text-paper"
            >
              Suivant
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section>
          <h2 className="font-display text-xl font-semibold text-navy">
            Équipements indispensables
          </h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {PREMIUM.map((a) => {
              const on = mustHave.includes(a);
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() =>
                    setMustHave((m) =>
                      on ? m.filter((x) => x !== a) : [...m, a],
                    )
                  }
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                    on ? "bg-gold text-navy" : "bg-paper-2 text-ink-2"
                  }`}
                >
                  {AMENITY_LABELS[a]}
                </button>
              );
            })}
          </div>
          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 rounded-full border border-line py-3 text-sm"
            >
              Retour
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void finish()}
              className="flex-1 rounded-full bg-gold py-3 font-semibold text-navy"
            >
              {busy ? "Enregistrement…" : "Terminer"}
            </button>
          </div>
        </section>
      )}

      <p className="mt-8 flex items-center gap-1 text-center text-xs text-muted">
        <Ico name="shield" size={14} /> Profil déclaratif — aucun tracking
        comportemental.
      </p>
    </div>
  );
}
