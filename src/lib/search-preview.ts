import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  listingPhotos,
  listings,
  propertyDetails,
  userProfiles,
} from "@/db/schema";
import { getCurrentSession } from "@/lib/auth";
import { computeCompatibility } from "@/lib/compatibility";
import type { Amenity } from "@/lib/amenities";
import { listingLocationCondition } from "@/lib/listing-geo-filter";
import { titleExclusionCondition } from "@/lib/listing-text-filter";
import type { SearchFilters } from "@/lib/llm/extract-filters";
export type PreviewListing = {
  id: string;
  title: string;
  price: number;
  transactionType: "sale" | "rent";
  photo: string | null;
  confidenceScore: number | null;
  compatibility: number | null;
  fokontany: string | null;
};

export async function searchPreview(
  filters: SearchFilters,
  limit = 3,
): Promise<{ total: number; listings: PreviewListing[]; medianHint: string | null }> {
  const conditions = [eq(listings.status, "active"), eq(listings.isDuplicate, false)];
  if (filters.txn) conditions.push(eq(listings.transactionType, filters.txn));
  if (filters.propertyType)
    conditions.push(eq(listings.propertyType, filters.propertyType));
  if (filters.minPrice !== undefined)
    conditions.push(sql`${listings.price} >= ${filters.minPrice}`);
  if (filters.maxPrice !== undefined)
    conditions.push(sql`${listings.price} <= ${filters.maxPrice}`);
  const locFilter = listingLocationCondition(filters);
  if (locFilter) conditions.push(locFilter);
  const titleEx = titleExclusionCondition(filters.excludeTitleContains);
  if (titleEx) conditions.push(titleEx);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(listings)
    .innerJoin(propertyDetails, eq(propertyDetails.listingId, listings.id))
    .where(and(...conditions));

  const orderBy = sql`${listings.confidenceScore} desc nulls last`;

  const rows = await db
    .select({
      id: listings.id,
      title: listings.title,
      price: listings.price,
      transactionType: listings.transactionType,
      fokontany: listings.fokontany,
      confidenceScore: listings.confidenceScore,
      amenities: listings.amenities,
      propertyType: listings.propertyType,
      surfaceM2: propertyDetails.surfaceM2,
      photo: sql<string | null>`(
        select p.path from ${listingPhotos} p
        where p.listing_id = ${listings.id}
        order by p.display_order limit 1
      )`,
    })
    .from(listings)
    .innerJoin(propertyDetails, eq(propertyDetails.listingId, listings.id))
    .where(and(...conditions))
    .orderBy(orderBy)
    .limit(Math.min(limit, 10));

  const { user } = await getCurrentSession();
  let profile = null;
  if (user) {
    profile = (
      await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, user.id))
        .limit(1)
    )[0];
  }

  const listingsOut: PreviewListing[] = rows.map((r) => {
    let compatibility: number | null = null;
    if (profile) {
      compatibility = computeCompatibility(
        {
          budgetMin: profile.budgetMin,
          budgetMax: profile.budgetMax,
          transactionType: profile.transactionType,
          quartiers: profile.quartiers,
          mustHave: profile.mustHave as Amenity[],
          propertyTypes: profile.propertyTypes,
          minSurface: profile.minSurface,
        },
        {
          price: r.price,
          transactionType: r.transactionType,
          fokontany: r.fokontany,
          amenities: (r.amenities ?? []) as Amenity[],
          propertyType: r.propertyType,
          surfaceM2: r.surfaceM2,
        },
      ).score;
    }
    return {
      id: r.id,
      title: r.title,
      price: r.price,
      transactionType: r.transactionType,
      photo: r.photo,
      confidenceScore: r.confidenceScore,
      compatibility,
      fokontany: r.fokontany,
    };
  });

  let medianHint: string | null = null;
  if (filters.nearLabel && filters.radiusKm) {
    medianHint = `${filters.nearLabel} · ${filters.radiusKm} km`;
  } else if (filters.fokontany) {
    medianHint = filters.radiusKm
      ? `${filters.fokontany} · ${filters.radiusKm} km`
      : filters.fokontany;
  }

  return { total: count, listings: listingsOut, medianHint };
}

// parseBbox unused - remove import