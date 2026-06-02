import { and, eq, inArray, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import {
  listingPhotos,
  listings,
  propertyDetails,
  userProfiles,
} from "@/db/schema";
import { type Amenity } from "@/lib/amenities";
import { getCurrentSession } from "@/lib/auth";
import {
  computeCompatibility,
  type CompatProfile,
} from "@/lib/compatibility";

/** GET /api/listings/compare?ids=a,b,c — enriched data for up to 3 listings. */
export async function GET(req: Request) {
  const ids = (new URL(req.url).searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);
  if (ids.length === 0) return NextResponse.json({ listings: [] });

  const rows = await db
    .select({
      id: listings.id,
      title: listings.title,
      price: listings.price,
      transactionType: listings.transactionType,
      propertyType: listings.propertyType,
      address: listings.address,
      fokontany: listings.fokontany,
      amenities: listings.amenities,
      confidenceScore: listings.confidenceScore,
      pricePerSqm: listings.pricePerSqm,
      estimatedRealCost: listings.estimatedRealCost,
      surfaceM2: propertyDetails.surfaceM2,
      rooms: propertyDetails.rooms,
      sourceCount: sql<number>`coalesce(jsonb_array_length(${listings.sources}), 0)`,
      photo: sql<
        string | null
      >`(select p.path from ${listingPhotos} p where p.listing_id = ${listings.id} order by p.display_order limit 1)`,
    })
    .from(listings)
    .innerJoin(propertyDetails, eq(propertyDetails.listingId, listings.id))
    .where(and(eq(listings.status, "active"), inArray(listings.id, ids)));

  const profile = await currentProfile();
  const byId = new Map(
    rows.map((r) => [
      r.id,
      {
        ...r,
        compatibility: profile
          ? computeCompatibility(profile, {
              price: r.price,
              transactionType: r.transactionType,
              fokontany: r.fokontany,
              amenities: (r.amenities ?? []) as Amenity[],
              propertyType: r.propertyType,
              surfaceM2: r.surfaceM2,
            }).score
          : null,
      },
    ]),
  );

  // Preserve the requested order.
  return NextResponse.json({
    listings: ids.map((id) => byId.get(id)).filter(Boolean),
  });
}

async function currentProfile(): Promise<CompatProfile | null> {
  const { user } = await getCurrentSession();
  if (!user) return null;
  const p = (
    await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, user.id))
      .limit(1)
  )[0];
  if (!p) return null;
  return {
    budgetMin: p.budgetMin,
    budgetMax: p.budgetMax,
    transactionType: p.transactionType,
    quartiers: p.quartiers,
    mustHave: p.mustHave as Amenity[],
    propertyTypes: p.propertyTypes,
    minSurface: p.minSurface,
  };
}
