import { and, eq, lt, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import {
  listingPhotos,
  listings,
  propertyDetails,
  userProfiles,
} from "@/db/schema";
import { AMENITIES, type Amenity } from "@/lib/amenities";
import { getCurrentSession } from "@/lib/auth";
import {
  computeCompatibility,
  type CompatProfile,
} from "@/lib/compatibility";
import { computeConfidence } from "@/lib/confidence";
import { resolveFokontany } from "@/lib/fokontany";
import { parseBbox } from "@/lib/geo";
import { estimateRealCost } from "@/lib/real-cost";
import {
  listingInputSchema,
  listingsQuerySchema,
} from "@/lib/validation";
import { validatePhotoPaths } from "@/lib/upload";
import { pricePerSqm } from "@/scrapers/enrich";

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
  if (q.fokontany) conditions.push(eq(listings.fokontany, q.fokontany));

  // Hide duplicates that have been folded into a canonical listing.
  conditions.push(eq(listings.isDuplicate, false));

  const limit = q.limit ?? 200;
  if (q.cursor) {
    const cur = await db
      .select({ createdAt: listings.createdAt })
      .from(listings)
      .where(eq(listings.id, q.cursor))
      .limit(1);
    if (cur[0]) {
      conditions.push(lt(listings.createdAt, cur[0].createdAt));
    }
  }

  // amenities: CSV of canonical keys; require the listing to have all of them.
  const requestedAmenities = (q.amenities ?? "")
    .split(",")
    .map((a) => a.trim())
    .filter((a): a is Amenity => (AMENITIES as readonly string[]).includes(a));
  if (requestedAmenities.length > 0) {
    conditions.push(
      sql`${listings.amenities} @> ${sql.raw(
        `ARRAY[${requestedAmenities.map((a) => `'${a}'`).join(",")}]::text[]`,
      )}`,
    );
  }

  const orderBy = {
    price_asc: sql`${listings.price} asc`,
    price_desc: sql`${listings.price} desc`,
    surface: sql`${propertyDetails.surfaceM2} desc nulls last`,
    confidence: sql`${listings.confidenceScore} desc nulls last`,
    compat: sql`${listings.confidenceScore} desc nulls last`, // M5 refines
    relevance: sql`${listings.createdAt} desc`,
  }[q.sort ?? "relevance"];

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
      fokontany: listings.fokontany,
      amenities: listings.amenities,
      confidenceScore: listings.confidenceScore,
      pricePerSqm: listings.pricePerSqm,
      sourceCount: sql<number>`coalesce(jsonb_array_length(${listings.sources}), 0)`,
      photo: sql<
        string | null
      >`(select p.path from ${listingPhotos} p where p.listing_id = ${listings.id} order by p.display_order limit 1)`,
    })
    .from(listings)
    .innerJoin(propertyDetails, eq(propertyDetails.listingId, listings.id))
    .where(and(...conditions))
    .orderBy(orderBy)
    .limit(limit);

  // Declared compatibility (M5): only when the signed-in user has a profile.
  const profile = await currentProfile();
  if (!profile) {
    return NextResponse.json({
      listings: rows.map((r) => ({ ...r, compatibility: null })),
      nextCursor:
        rows.length === limit ? rows[rows.length - 1]?.id ?? null : null,
    });
  }

  let scored = rows.map((r) => ({
    ...r,
    compatibility: computeCompatibility(profile, {
      price: r.price,
      transactionType: r.transactionType,
      fokontany: r.fokontany,
      amenities: (r.amenities ?? []) as Amenity[],
      propertyType: r.propertyType,
      surfaceM2: r.surfaceM2,
    }).score,
  }));

  // With a profile, "compat" sort (and the default ordering) ranks by fit.
  if (q.sort === "compat" || q.sort === undefined) {
    scored = scored.sort((a, b) => b.compatibility - a.compatibility);
  }

  return NextResponse.json({
    listings: scored,
    nextCursor:
      rows.length === limit ? rows[rows.length - 1]?.id ?? null : null,
  });
}

/** The signed-in user's compatibility profile, or null if none/anonymous. */
async function currentProfile(): Promise<CompatProfile | null> {
  const { user } = await getCurrentSession();
  if (!user) return null;
  const rows = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, user.id))
    .limit(1);
  const p = rows[0];
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
  if (input.photoPaths.length > 0) {
    const photos = await validatePhotoPaths(input.photoPaths);
    if (!photos.ok) {
      return NextResponse.json({ error: photos.error }, { status: 400 });
    }
  }
  const id = crypto.randomUUID();

  const fokontany = resolveFokontany(input.lng, input.lat);
  const realCost = estimateRealCost({
    price: input.price,
    transactionType: input.transactionType,
    surfaceM2: input.surfaceM2,
    amenities: input.amenities,
  });
  const { score, breakdown } = computeConfidence({
    photoCount: input.photoPaths.length,
    surfaceM2: input.surfaceM2,
    fokontany,
    ageDays: 0,
    price: input.price,
    neighborhoodMedianPrice: null,
    sourceCount: 1,
  });

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
      fokontany,
      amenities: input.amenities,
      confidenceScore: score,
      confidenceBreakdown: breakdown,
      pricePerSqm: pricePerSqm(input.price, input.surfaceM2),
      estimatedRealCost: realCost?.total ?? null,
      sources: [{ source: "user", url: null }],
      lastSeenAt: new Date(),
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
