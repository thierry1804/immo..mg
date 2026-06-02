"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_NAV } from "./nav-items";

/**
 * Desktop/tablet primary navigation — mirrors the mobile TabBar routes.
 */
export default function MainNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Sections principales"
      className="hidden items-center gap-1 md:flex"
    >
      {APP_NAV.map((item) => {
        const active = item.isActive(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
              active
                ? "bg-gold text-navy"
                : "text-navy-100 hover:bg-navy-700 hover:text-gold"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
