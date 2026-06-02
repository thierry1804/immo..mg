import type { Metadata } from "next";
import { Playfair_Display, Hanken_Grotesk } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import LogoutButton from "@/components/LogoutButton";
import TabBar from "@/components/immo/TabBar";
import { getCurrentSession } from "@/lib/auth";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
        <header className="flex h-14 items-center justify-between bg-navy px-6 text-paper">
          <Link
            href="/"
            className="font-display text-lg font-semibold tracking-tight"
          >
            immo<span className="text-gold">·</span>mg
          </Link>
          <nav className="flex items-center gap-4 text-sm">
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
        <div className="pb-14 md:pb-0">{children}</div>
        <TabBar />
      </body>
    </html>
  );
}
