"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Ico from "./Ico";

const HIDDEN_ON = ["/chat"];

/**
 * Floating chat entry point for desktop (the mobile TabBar already has a Chat
 * tab, so this is hidden below md).
 */
export default function ChatFab() {
  const pathname = usePathname();
  if (HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return null;
  }

  return (
    <Link
      href="/chat"
      aria-label="Ouvrir l'assistant de recherche"
      className="focus-gold animate-rise fixed bottom-6 right-6 z-30 hidden items-center gap-2 rounded-full bg-navy px-4 py-3 font-semibold text-paper shadow-drawer transition hover:bg-navy-700 hover:shadow-[0_8px_28px_rgba(13,33,55,0.35)] md:inline-flex"
    >
      <Ico name="spark" size={18} className="text-gold" />
      Assistant
    </Link>
  );
}
