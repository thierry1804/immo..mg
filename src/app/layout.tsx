import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import LogoutButton from "@/components/LogoutButton";
import { getCurrentSession } from "@/lib/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GeoMarket",
  description:
    "Explorez biens, véhicules et services disponibles autour de vous.",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-white text-zinc-900">
        <header className="flex h-13 items-center justify-between border-b border-zinc-200 px-4">
          <Link href="/" className="text-sm font-semibold">
            GeoMarket
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            {user ? (
              <>
                {user.role === "admin" && (
                  <>
                    <Link
                      href="/admin/sources"
                      className="text-zinc-700 hover:underline"
                    >
                      Sources
                    </Link>
                    <Link
                      href="/admin/moderation"
                      className="text-zinc-700 hover:underline"
                    >
                      Modération
                    </Link>
                  </>
                )}
                <Link
                  href="/listings/new"
                  className="rounded bg-zinc-900 px-3 py-1.5 text-white"
                >
                  + Publier
                </Link>
                <span className="hidden text-zinc-600 sm:inline">
                  {user.email}
                </span>
                <LogoutButton />
              </>
            ) : (
              <>
                <Link href="/login" className="text-zinc-700 hover:underline">
                  Connexion
                </Link>
                <Link
                  href="/signup"
                  className="rounded bg-zinc-900 px-3 py-1.5 text-white"
                >
                  Créer un compte
                </Link>
              </>
            )}
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
