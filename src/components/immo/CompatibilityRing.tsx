type Props = {
  /** Compatibility 0–100. */
  score: number;
  size?: number;
  /** Short caption under the number, e.g. "compatible". */
  label?: string;
};

/**
 * Circular compatibility gauge (navy track + gold progress). Rendered only when
 * a declared profile exists (M5) — callers gate on a non-null score.
 */
export default function CompatibilityRing({
  score,
  size = 72,
  label = "compatible",
}: Props) {
  const pct = Math.max(0, Math.min(100, Math.round(score)));
  const stroke = size >= 64 ? 6 : 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct / 100);
  return (
    <div
      className="relative inline-grid place-items-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--navy-100)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--gold)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 600ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center leading-none">
        <div>
          <div className="tnum font-display font-semibold text-navy">
            {pct}
            <span className="text-[0.6em] font-normal text-muted">%</span>
          </div>
          {label && (
            <div className="mt-0.5 text-[9px] uppercase tracking-wide text-muted">
              {label}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
