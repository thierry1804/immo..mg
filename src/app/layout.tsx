import type { Metadata } from "next";
import { Playfair_Display, Hanken_Grotesk } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import LogoutButton from "@/components/LogoutButton";
import ChatFab from "@/components/immo/ChatFab";
import CompareBar from "@/components/immo/CompareBar";
import MainNav from "@/components/immo/MainNav";
import TabBar from "@/components/immo/TabBar";
import { getCurrentSession } from "@/lib/auth";

// Variable fonts: one file covering the full weight axis (Next.js recommends
// variable fonts). Omitting `weight` selects the variable file automatically.
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "immo·mg — Conseiller immobilier IA",
  description:
    "Agrège, dédoublonne et enrichit les annonces immobilières d'Antananarivo. Confiance, coût réel et recommandation.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { user } = await getCurrentSession();
  return (
    <html
      lang="fr"
      className={`${playfair.variable} ${hanken.variable} immo h-full antialiased`}
    >
      <body className="min-h-full bg-paper text-ink">
        <header className="sticky top-0 z-50 flex h-14 items-center justify-between gap-4 border-b border-navy-700/60 bg-navy/95 px-4 text-paper backdrop-blur-md md:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-4 md:gap-8">
            <Link
              href="/"
              className="focus-gold shrink-0 font-display text-lg font-semibold tracking-tight transition hover:text-gold"
            >
              immo<span className="text-gold">·</span>mg
            </Link>
            <MainNav />
          </div>
          <nav
            aria-label="Compte et actions"
            className="flex shrink-0 items-center gap-3 text-sm md:gap-4"
          >
            {user ? (
              <>
                {user.role === "admin" && (
                  <>
                    <Link
                      href="/admin/sources"
                      className="hidden text-navy-100 hover:text-gold sm:inline"
                    >
                      Sources
                    </Link>
                    <Link
                      href="/admin/moderation"
                      className="hidden text-navy-100 hover:text-gold sm:inline"
                    >
                      Modération
                    </Link>
                  </>
                )}
                <Link
                  href="/listings/new"
                  className="rounded-full bg-gold px-3 py-1.5 font-semibold text-navy"
                >
                  + Publier
                </Link>
                <span className="hidden text-navy-300 sm:inline">
                  {user.email}
                </span>
                <LogoutButton />
              </>
            ) : (
              <>
                <Link href="/login" className="text-navy-100 hover:text-gold">
                  Connexion
                </Link>
                <Link
                  href="/signup"
                  className="rounded-full bg-gold px-3 py-1.5 font-semibold text-navy"
                >
                  Créer un compte
                </Link>
              </>
            )}
          </nav>
        </header>
        <div className="pb-tab">{children}</div>
        <CompareBar />
        <ChatFab />
        <TabBar />
      </body>
    </html>
  );
}
