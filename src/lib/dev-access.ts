export type DevAccessAccount = {
  email: string;
  password: string;
  label: string;
  role: "user" | "admin";
};

export type DevLoginPanel = {
  enabled: boolean;
  accounts: DevAccessAccount[];
  bootstrapEmail: string | null;
  adminLinks: { href: string; label: string }[];
};

/** Comptes affichés sur /login en développement (liste figée). */
export const STATIC_DEV_ACCESS_ACCOUNTS: DevAccessAccount[] = [
  {
    email: "admin@geomarket.local",
    password: "geomarket-dev",
    label: "Administrateur",
    role: "admin",
  },
  {
    email: "alice@example.com",
    password: "geomarket-dev",
    label: "Utilisateur démo",
    role: "user",
  },
];

const STATIC_BOOTSTRAP_EMAIL = "admin@geomarket.local";

const ADMIN_LINKS = [
  { href: "/", label: "Accueil & carte" },
  { href: "/admin/moderation", label: "Modération des annonces" },
  { href: "/admin/sources", label: "Sources & scrapers" },
  { href: "/preferences", label: "Préférences & profil" },
] as const;

export function isDevAccessEnabled(): boolean {
  return process.env.NODE_ENV === "development";
}

export function getDevLoginPanel(): DevLoginPanel {
  if (!isDevAccessEnabled()) {
    return {
      enabled: false,
      accounts: [],
      bootstrapEmail: null,
      adminLinks: [],
    };
  }

  return {
    enabled: true,
    accounts: STATIC_DEV_ACCESS_ACCOUNTS,
    bootstrapEmail: STATIC_BOOTSTRAP_EMAIL,
    adminLinks: [...ADMIN_LINKS],
  };
}
