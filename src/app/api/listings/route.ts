import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { listingPhotos, listings, propertyDetails } from "@/db/schema";
import { getCurrentSession } from "@/lib/auth";
import { parseBbox } from "@/lib/geo";
import {
  listingInputSchema,
  listingsQuerySchema,
} from "@/lib/validation";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const queryParams = Object.fromEntries(url.searchParams.entries());
  const parsed = listingsQuerySchema.safeParse(queryParams);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }
  const q = parsed.data;
  const bbox = parseBbox(q.bbox);

  const conditions = [eq(listings.status, "active")];
  if (bbox) {
    conditions.push(
      sql`ST_Intersects(${listings.location}, ST_MakeEnvelope(${bbox.minLng}, ${bbox.minLat}, ${bbox.maxLng}, ${bbox.maxLat}, 4326)::geography)`,
    );
  }
  if (q.txn) conditions.push(eq(listings.transactionType, q.txn));
  if (q.propertyType) conditions.push(eq(listings.propertyType, q.propertyType));
  if (q.minPrice !== undefined)
    conditions.push(sql`${listings.price} >= ${q.minPrice}`);
  if (q.maxPrice !== undefined)
    conditions.push(sql`${listings.price} <= ${q.maxPrice}`);
  if (q.minSurface !== undefined)
    conditions.push(sql`${propertyDetails.surfaceM2} >= ${q.minSurface}`);
  if (q.minRooms !== undefined)
    conditions.push(sql`${propertyDetails.rooms} >= ${q.minRooms}`);

  const rows = await db
    .select({
      id: listings.id,
      title: listings.title,
      price: listings.price,
      transactionType: listings.transactionType,
      propertyType: listings.propertyType,
      address: listings.address,
      lng: sql<number>`ST_X(${listings.location}::geometry)`,
      lat: sql<number>`ST_Y(${listings.location}::geometry)`,
      surfaceM2: propertyDetails.surfaceM2,
      rooms: propertyDetails.rooms,
    })
    .from(listings)
    .innerJoin(propertyDetails, eq(propertyDetails.listingId, listings.id))
    .where(and(...conditions))
    .orderBy(sql`${listings.createdAt} desc`)
    .limit(200);

  return NextResponse.json({ listings: rows });
}

export async function POST(req: Request) {
  const { user } = await getCurrentSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const parsed = listingInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const input = parsed.data;
  const id = crypto.randomUUID();

  await db.transaction(async (tx) => {
    await tx.insert(listings).values({
      id,
      userId: user.id,
      title: input.title,
      description: input.description,
      transactionType: input.transactionType,
      propertyType: input.propertyType,
      price: input.price,
      address: input.address,
      location: { lng: input.lng, lat: input.lat },
    });
    await tx.insert(propertyDetails).values({
      listingId: id,
      surfaceM2: input.surfaceM2,
      rooms: input.rooms,
      bedrooms: input.bedrooms ?? null,
      bathrooms: input.bathrooms ?? null,
    });
    if (input.photoPaths.length > 0) {
      await tx.insert(listingPhotos).values(
        input.photoPaths.map((path, i) => ({
          id: crypto.randomUUID(),
          listingId: id,
          path,
          displayOrder: i,
        })),
      );
    }
  });

  return NextResponse.json({ id }, { status: 201 });
}
