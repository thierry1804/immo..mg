"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Ico, { type IcoName } from "./Ico";

type Tab = {
  href: string;
  label: string;
  icon: IcoName;
  isActive: (pathname: string, view: string | null) => boolean;
};

const TABS: Tab[] = [
  {
    href: "/",
    label: "Rechercher",
    icon: "spark",
    isActive: (p, v) => p === "/" && v !== "map",
  },
  {
    href: "/?view=map",
    label: "Carte",
    icon: "pin",
    isActive: (p, v) => p === "/" && v === "map",
  },
  {
    href: "/chat",
    label: "Chat",
    icon: "send",
    isActive: (p) => p === "/chat",
  },
  {
    href: "/preferences",
    label: "Profil",
    icon: "house",
    isActive: (p) => p === "/preferences",
  },
];

function TabBarInner() {
  const pathname = usePathname();
  const view = useSearchParams().get("view");
  return (
    <nav
      aria-label="Navigation mobile"
      className="fixed inset-x-0 bottom-0 z-40 flex h-14 items-stretch border-t border-navy-700 bg-navy text-paper md:hidden"
    >
      {TABS.map((t) => {
        const active = t.isActive(pathname, view);
        return (
          <Link
            key={t.label}
            href={t.href}
            aria-current={active ? "page" : undefined}
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

export default function TabBar() {
  // useSearchParams() requires a Suspense boundary (Next renders the bar
  // statically until the query is known).
  return (
    <Suspense fallback={null}>
      <TabBarInner />
    </Suspense>
  );
}
