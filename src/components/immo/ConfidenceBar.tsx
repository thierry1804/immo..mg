import type { ConfidenceCheck } from "@/lib/confidence";
import Ico from "./Ico";

type Props = {
  score: number;
  /** When provided, lists each criterion with a check/minus. */
  breakdown?: ConfidenceCheck[];
  size?: "sm" | "md";
};

/**
 * Confidence score (0–100) as a gold gradient bar (the one allowed decorative
 * gradient, DESIGN §2). With a breakdown, expands into the explainable list
 * behind the score (PRODUCT §4.1).
 */
export default function ConfidenceBar({
  score,
  breakdown,
  size = "md",
}: Props) {
  const pct = Math.max(0, Math.min(100, score));
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span
          className={`font-medium text-ink-2 ${size === "sm" ? "text-[11px]" : "text-xs"}`}
        >
          Indice de confiance
        </span>
        <span className="tnum font-display text-sm font-semibold text-navy">
          {pct}
          <span className="text-[11px] font-normal text-muted">/100</span>
        </span>
      </div>
      <div
        className={`mt-1 overflow-hidden rounded-full bg-paper-2 ${size === "sm" ? "h-1.5" : "h-2"}`}
        role="meter"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Indice de confiance"
      >
        <div
          className="score-fill h-full rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      {breakdown && breakdown.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {breakdown.map((c) => (
            <li
              key={c.key}
              className="flex items-center justify-between gap-2 text-xs"
            >
              <span
                className={`inline-flex items-center gap-1.5 ${c.ok ? "text-ink-2" : "text-muted"}`}
              >
                <span
                  className={`grid h-4 w-4 place-items-center rounded-full ${
                    c.ok
                      ? "bg-present-bg text-present"
                      : "bg-paper-2 text-muted"
                  }`}
                >
                  <Ico name={c.ok ? "check" : "minus"} size={11} />
                </span>
                {c.label}
              </span>
              <span className="tnum text-muted">+{c.weight}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
