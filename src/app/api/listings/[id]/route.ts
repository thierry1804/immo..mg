import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { listingPhotos, listings, propertyDetails } from "@/db/schema";
import { getCurrentSession } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const rows = await db
    .select({
      id: listings.id,
      userId: listings.userId,
      title: listings.title,
      description: listings.description,
      transactionType: listings.transactionType,
      propertyType: listings.propertyType,
      price: listings.price,
      address: listings.address,
      lng: sql<number>`ST_X(${listings.location}::geometry)`,
      lat: sql<number>`ST_Y(${listings.location}::geometry)`,
      createdAt: listings.createdAt,
      surfaceM2: propertyDetails.surfaceM2,
      rooms: propertyDetails.rooms,
      bedrooms: propertyDetails.bedrooms,
      bathrooms: propertyDetails.bathrooms,
    })
    .from(listings)
    .innerJoin(propertyDetails, eq(propertyDetails.listingId, listings.id))
    .where(and(eq(listings.id, id), eq(listings.status, "active")))
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const photos = await db
    .select({ path: listingPhotos.path, displayOrder: listingPhotos.displayOrder })
    .from(listingPhotos)
    .where(eq(listingPhotos.listingId, id))
    .orderBy(listingPhotos.displayOrder);

  return NextResponse.json({ listing: rows[0], photos });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user } = await getCurrentSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const found = await db
    .select({ userId: listings.userId })
    .from(listings)
    .where(eq(listings.id, id))
    .limit(1);
  if (found.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (found[0].userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await db
    .update(listings)
    .set({ status: "archived" })
    .where(eq(listings.id, id));
  return NextResponse.json({ ok: true });
}
