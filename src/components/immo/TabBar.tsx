"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Ico from "./Ico";
import { APP_NAV } from "./nav-items";

export default function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigation mobile"
      className="fixed inset-x-0 bottom-0 z-40 flex min-h-14 items-stretch border-t border-navy-700/80 bg-navy/95 pb-[env(safe-area-inset-bottom)] text-paper backdrop-blur-md md:hidden"
    >
      {APP_NAV.map((item) => {
        const active = item.isActive(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`focus-gold relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors active:opacity-80 ${
              active ? "text-gold" : "text-navy-300 hover:text-navy-100"
            }`}
          >
            {active && (
              <span
                className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-gold"
                aria-hidden
              />
            )}
            <span
              className={`transition-transform duration-200 ease-out ${
                active ? "scale-110" : "scale-100"
              }`}
            >
              <Ico name={item.icon} size={20} />
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
