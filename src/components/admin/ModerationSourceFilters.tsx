import Link from "next/link";
import { sourceLabel } from "@/lib/moderation-labels";

type Count = { source: string; count: number };

export default function ModerationSourceFilters({
  counts,
  total,
  activeSource,
}: {
  counts: Count[];
  total: number;
  activeSource?: string;
}) {
  const sorted = [...counts].sort((a, b) => b.count - a.count);

  return (
    <div className="flex flex-wrap gap-2">
      <FilterPill
        href="/admin/moderation"
        label="Toutes"
        count={total}
        active={!activeSource}
      />
      {sorted.map((c) => (
        <FilterPill
          key={c.source}
          href={`/admin/moderation?source=${encodeURIComponent(c.source)}`}
          label={sourceLabel(c.source)}
          count={c.count}
          active={activeSource === c.source}
        />
      ))}
    </div>
  );
}

function FilterPill({
  href,
  label,
  count,
  active,
}: {
  href: string;
  label: string;
  count: number;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`focus-gold inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? "bg-navy text-paper shadow-card"
          : "border border-line bg-white text-ink-2 hover:border-navy-300"
      }`}
    >
      {label}
      <span
        className={`rounded-full px-1.5 py-0.5 text-[10px] ${
          active ? "bg-gold text-navy" : "bg-paper-2 text-ink-2"
        }`}
      >
        {count}
      </span>
    </Link>
  );
}
