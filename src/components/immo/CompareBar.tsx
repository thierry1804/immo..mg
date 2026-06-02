"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCompare } from "@/lib/use-compare";
import Ico from "./Ico";

/**
 * Floating bar summarizing the compare selection (up to 3) with a link to the
 * comparison screen. Sits above the mobile TabBar; hidden when empty or already
 * on /compare.
 */
export default function CompareBar() {
  const { ids, clear, max } = useCompare();
  const pathname = usePathname();
  if (ids.length === 0 || pathname === "/compare") return null;

  return (
    <div
      className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px)+0.5rem)] z-30 flex justify-center px-4 md:bottom-6"
      role="status"
      aria-live="polite"
    >
      <div className="animate-rise flex items-center gap-3 rounded-full border border-navy-600/50 bg-navy/95 px-4 py-2.5 shadow-drawer backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-paper">
          <Ico name="scale" size={16} className="text-gold" />
          {ids.length}/{max} à comparer
        </span>
        <button
          type="button"
          onClick={clear}
          className="focus-gold rounded-full px-1 text-xs text-navy-300 transition hover:text-paper"
        >
          Vider
        </button>
        <Link
          href={`/compare?ids=${ids.join(",")}`}
          className="focus-gold rounded-full bg-gold px-4 py-1.5 text-sm font-semibold text-navy transition hover:bg-gold-700 active:scale-[0.98]"
        >
          Comparer
        </Link>
      </div>
    </div>
  );
}
