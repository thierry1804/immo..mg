import Link from "next/link";
import Ico from "./Ico";

/**
 * Floating chat entry point for desktop (the mobile TabBar already has a Chat
 * tab, so this is hidden below md).
 */
export default function ChatFab() {
  return (
    <Link
      href="/chat"
      aria-label="Ouvrir l'assistant de recherche"
      className="fixed bottom-6 right-6 z-30 hidden items-center gap-2 rounded-full bg-navy px-4 py-3 font-semibold text-paper shadow-drawer transition hover:bg-navy-700 md:inline-flex"
    >
      <Ico name="spark" size={18} className="text-gold" />
      Assistant
    </Link>
  );
}
