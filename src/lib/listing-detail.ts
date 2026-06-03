import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  listingPhotos,
  listings,
  propertyDetails,
  userProfiles,
} from "@/db/schema";
import type { Amenity } from "@/lib/amenities";
import { getCurrentSession } from "@/lib/auth";
import {
  computeCompatibility,
  type CompatibilityResult,
} from "@/lib/compatibility";
import type { ConfidenceCheck } from "@/lib/confidence";
import { estimateRealCost, type RealCostBreakdown } from "@/lib/real-cost";

export type ListingDetail = {
  id: string;
  title: string;
  description: string;
  transactionType: "sale" | "rent";
  propertyType: "house" | "apartment" | "land" | "commercial" | "other";
  price: number;
  address: string;
  fokontany: string | null;
  amenities: Amenity[];
  confidenceScore: number | null;
  confidenceBreakdown: ConfidenceCheck[];
  pricePerSqm: number | null;
  sources: { source: string; url: string | null }[];
  lng: number;
  lat: number;
  surfaceM2: number;
  rooms: number;
  bedrooms: number | null;
  bathrooms: number | null;
  lastSeenAt: string | null;
  photos: { path: string }[];
  realCost: RealCostBreakdown | null;
  compatibility: CompatibilityResult | null;
};

export async function fetchListingDetail(
  id: string,
): Promise<ListingDetail | null> {
  const rows = await db
    .select({
      id: listings.id,
      title: listings.title,
      description: listings.description,
      transactionType: listings.transactionType,
      propertyType: listings.propertyType,
      price: listings.price,
      address: listings.address,
      fokontany: listings.fokontany,
      amenities: listings.amenities,
      confidenceScore: listings.confidenceScore,
      confidenceBreakdown: listings.confidenceBreakdown,
      pricePerSqm: listings.pricePerSqm,
      sources: listings.sources,
      lastSeenAt: listings.lastSeenAt,
      lng: sql<number>`ST_X(${listings.location}::geometry)`,
      lat: sql<number>`ST_Y(${listings.location}::geometry)`,
      surfaceM2: propertyDetails.surfaceM2,
      rooms: propertyDetails.rooms,
      bedrooms: propertyDetails.bedrooms,
      bathrooms: propertyDetails.bathrooms,
    })
    .from(listings)
    .innerJoin(propertyDetails, eq(propertyDetails.listingId, listings.id))
    .where(and(eq(listings.id, id), eq(listings.status, "active")))
    .limit(1);

  if (rows.length === 0) return null;
  const row = rows[0];
  const photos = await db
    .select({ path: listingPhotos.path })
    .from(listingPhotos)
    .where(eq(listingPhotos.listingId, id))
    .orderBy(listingPhotos.displayOrder);

  const amenities = (row.amenities ?? []) as Amenity[];
  const realCost = estimateRealCost({
    price: row.price,
    transactionType: row.transactionType,
    surfaceM2: row.surfaceM2,
    amenities,
  });

  const { user } = await getCurrentSession();
  let compatibility: CompatibilityResult | null = null;
  if (user) {
    const prof = (
      await db
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, user.id))
        .limit(1)
    )[0];
    if (prof) {
      compatibility = computeCompatibility(
        {
          budgetMin: prof.budgetMin,
          budgetMax: prof.budgetMax,
          transactionType: prof.transactionType,
          quartiers: prof.quartiers,
          mustHave: prof.mustHave as Amenity[],
          propertyTypes: prof.propertyTypes,
          minSurface: prof.minSurface,
        },
        {
          price: row.price,
          transactionType: row.transactionType,
          fokontany: row.fokontany,
          amenities,
          propertyType: row.propertyType,
          surfaceM2: row.surfaceM2,
        },
      );
    }
  }

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    transactionType: row.transactionType,
    propertyType: row.propertyType,
    price: row.price,
    address: row.address,
    fokontany: row.fokontany,
    amenities,
    confidenceScore: row.confidenceScore,
    confidenceBreakdown: (row.confidenceBreakdown ?? []) as ConfidenceCheck[],
    pricePerSqm: row.pricePerSqm,
    sources: row.sources ?? [],
    lng: row.lng,
    lat: row.lat,
    surfaceM2: row.surfaceM2,
    rooms: row.rooms,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    lastSeenAt: row.lastSeenAt?.toISOString() ?? null,
    photos,
    realCost,
    compatibility,
  };
}
