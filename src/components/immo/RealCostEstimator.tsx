import { formatAriary } from "@/lib/format";
import type { RealCostBreakdown } from "@/lib/real-cost";

const ROWS: { key: keyof RealCostBreakdown; label: string }[] = [
  { key: "loyer", label: "Loyer affiché" },
  { key: "eau", label: "Eau (JIRAMA, est.)" },
  { key: "electricite", label: "Électricité (est.)" },
  { key: "gardien", label: "Gardien" },
  { key: "charges", label: "Charges & entretien" },
];

/**
 * "Coût réel" panel for rentals: the advertised rent plus the recurring costs a
 * Tana tenant actually pays (PRODUCT §5.4). Always framed as an estimate.
 */
export default function RealCostEstimator({
  cost,
}: {
  cost: RealCostBreakdown;
}) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base font-semibold text-navy">
          Coût réel estimé
        </h3>
        <span className="rounded-full bg-gold-tint px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gold-700">
          estimation
        </span>
      </div>
      <dl className="mt-3 divide-y divide-line-2 text-sm">
        {ROWS.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between py-1.5">
            <dt className="text-ink-2">{label}</dt>
            <dd className="tnum text-ink">
              {cost[key] > 0 ? formatAriary(cost[key]) : "—"}
            </dd>
          </div>
        ))}
        <div className="flex items-center justify-between py-2.5">
          <dt className="font-semibold text-navy">Total mensuel</dt>
          <dd className="tnum font-display text-base font-semibold text-navy">
            {formatAriary(cost.total)}
          </dd>
        </div>
      </dl>
      <p className="mt-2 text-[11px] leading-snug text-muted">
        Estimation indicative basée sur la surface et les équipements. Les
        montants réels varient selon l&apos;usage et le contrat.
      </p>
    </div>
  );
}
