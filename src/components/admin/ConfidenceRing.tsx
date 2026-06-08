type Props = {
  /** Confiance du géocodage 0–100. Ignoré si `locked`. */
  score: number;
  /** Position corrigée manuellement → anneau plein vert. */
  locked?: boolean;
  size?: number;
};

/**
 * Anneau de confiance géo (vue Focus). Vert ≥80 / ambre 60–79 / rouge <60.
 * Inspiré de `CompatibilityRing` mais teinté par seuil et pilotable en « verrouillé ».
 */
export default function ConfidenceRing({ score, locked = false, size = 64 }: Props) {
  const pct = locked ? 100 : Math.max(0, Math.min(100, Math.round(score)));
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct / 100);
  const color = locked
    ? "var(--present)"
    : pct >= 80
      ? "var(--present)"
      : pct >= 60
        ? "var(--absent)"
        : "var(--alert)";
  return (
    <div
      className="relative inline-grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--paper-2)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset .5s cubic-bezier(.22,1,.36,1)" }}
        />
      </svg>
      <span className="tnum absolute font-display text-base font-semibold text-navy">
        {pct}
      </span>
    </div>
  );
}
