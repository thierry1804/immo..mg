"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Ico, { type IcoName } from "./Ico";

const TABS: Array<{ href: string; label: string; icon: IcoName }> = [
  { href: "/", label: "Rechercher", icon: "spark" },
  { href: "/?view=map", label: "Carte", icon: "pin" },
  { href: "/chat", label: "Chat", icon: "spark" },
  { href: "/preferences", label: "Profil", icon: "house" },
];

export default function TabBar() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex h-14 items-stretch border-t border-navy-700 bg-navy text-paper md:hidden">
      {TABS.map((t) => {
        const active = pathname === t.href.split("?")[0];
        return (
          <Link
            key={t.label}
            href={t.href}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              active ? "text-gold" : "text-navy-300"
            }`}
          >
            <Ico name={t.icon} size={20} />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
