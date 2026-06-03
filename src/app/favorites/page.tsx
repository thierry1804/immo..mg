"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PropertyCard, {
  type PropertySummary,
} from "@/components/immo/PropertyCard";
import ListingSkeleton from "@/components/immo/ListingSkeleton";

export default function FavoritesPage() {
  const [listings, setListings] = useState<PropertySummary[] | null>(null);

  useEffect(() => {
    fetch("/api/user/favorites/listings")
      .then((r) => {
        if (r.status === 401) {
          setListings([]);
          return null;
        }
        return r.json();
      })
      .then((d: { listings: PropertySummary[] } | null) => {
        setListings(d?.listings ?? []);
      })
      .catch(() => setListings([]));
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6">
      <h1 className="font-display text-3xl font-semibold text-navy">
        Mes favoris
      </h1>
      {listings === null ? (
        <ul className="mt-6 space-y-3">
          {[0, 1].map((i) => (
            <li key={i}>
              <ListingSkeleton />
            </li>
          ))}
        </ul>
      ) : listings.length === 0 ? (
        <p className="mt-6 text-ink-2">
          Aucun favori.{" "}
          <Link href="/" className="text-navy-600 hover:underline">
            Parcourir la carte
          </Link>
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {listings.map((l) => (
            <li key={l.id}>
              <PropertyCard listing={l} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
