import { eq, sql, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import {
  listingPhotos,
  listings,
  propertyDetails,
  userFavorites,
} from "@/db/schema";
import { getCurrentSession } from "@/lib/auth";

export async function GET() {
  const { user } = await getCurrentSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
      sourceCount: sql<number>`coalesce(jsonb_array_length(${listings.sources}), 0)`,
      surfaceM2: propertyDetails.surfaceM2,
      rooms: propertyDetails.rooms,
      photo: sql<string | null>`(
        select p.path from ${listingPhotos} p
        where p.listing_id = ${listings.id}
        order by p.display_order limit 1
      )`,
    })
    .from(userFavorites)
    .innerJoin(listings, eq(listings.id, userFavorites.listingId))
    .innerJoin(propertyDetails, eq(propertyDetails.listingId, listings.id))
    .where(
      and(
        eq(userFavorites.userId, user.id),
        eq(listings.status, "active"),
      ),
    );

  return NextResponse.json({ listings: rows });
}
