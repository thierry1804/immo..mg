import type { IcoName } from "./Ico";

export type AppNavItem = {
  href: string;
  label: string;
  icon: IcoName;
  isActive: (pathname: string) => boolean;
};

/** Primary app sections — shared by header (desktop) and TabBar (mobile). */
export const APP_NAV: AppNavItem[] = [
  {
    href: "/",
    label: "Accueil",
    icon: "spark",
    isActive: (p) => p === "/" || p.startsWith("/listings/"),
  },
  {
    href: "/chat",
    label: "Chat",
    icon: "send",
    isActive: (p) => p === "/chat",
  },
  {
    href: "/favorites",
    label: "Favoris",
    icon: "star",
    isActive: (p) => p === "/favorites",
  },
  {
    href: "/compare",
    label: "Comparer",
    icon: "scale",
    isActive: (p) => p === "/compare",
  },
  {
    href: "/preferences",
    label: "Profil",
    icon: "house",
    isActive: (p) => p === "/preferences",
  },
];
