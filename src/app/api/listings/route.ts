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
import {
  listingDistanceExpr,
  listingLocationCondition,
} from "@/lib/listing-geo-filter";
import { titleExclusionCondition } from "@/lib/listing-text-filter";
import { resolveFokontany } from "@/lib/fokontany";
import { resolveListingsGeoQuery } from "@/lib/resolve-search-place";
import { parseBbox } from "@/lib/geo";
import { estimateRealCost } from "@/lib/real-cost";
import {
  listingInputSchema,
  listingsQuerySchema,
} from "@/lib/validation";
import { validatePhotoPaths } from "@/lib/upload";
import { pricePerSqm } from "@/scrapers/enrich";
import { embeddingColumns, embed } from "@/lib/llm/embeddings";
import {
  normalizeTextQuery,
  lexRankExpr,
  textMatchCondition,
} from "@/lib/listing-text-search";
import {
  computeRelevanceScore,
  SEMANTIC_MATCH_FLOOR,
} from "@/lib/search-ranking";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const queryParams = Object.fromEntries(url.searchParams.entries());
  const parsed = listingsQuerySchema.safeParse(queryParams);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query" }, { status: 400 });
  }
  const q = await resolveListingsGeoQuery(parsed.data);
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
  const locFilter = listingLocationCondition(q);
  if (locFilter) conditions.push(locFilter);
  const distanceExpr = listingDistanceExpr(q);
  const textQ = normalizeTextQuery(q.q);
  const queryVec = textQ ? await embed(textQ) : null;
  const vecLiteral = queryVec
    ? sql`ARRAY[${sql.join(queryVec.map((n) => sql`${n}`), sql`,`)}]::real[]`
    : null;
  const titleEx = titleExclusionCondition(q.excludeTitleContains);
  if (titleEx) conditions.push(titleEx);

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

  // Pour les requêtes purement textuelles (sans filtre structurel), on impose
  // un plancher de pertinence afin de ne pas renvoyer tout le catalogue.
  const noStructuralFilter =
    !bbox &&
    !locFilter &&
    q.minPrice == null &&
    q.maxPrice == null &&
    q.minSurface == null &&
    q.minRooms == null &&
    requestedAmenities.length === 0 &&
    !q.txn &&
    !q.propertyType;
  if (textQ && noStructuralFilter) {
    conditions.push(
      vecLiteral
        ? sql`(${textMatchCondition(textQ)} OR cosine_similarity(${listings.embedding}, ${vecLiteral}) > ${SEMANTIC_MATCH_FLOOR})`
        : textMatchCondition(textQ),
    );
  }

  const orderBy =
    (q.sort ?? "relevance") === "relevance" && distanceExpr
      ? sql`${distanceExpr} asc`
      : {
          price_asc: sql`${listings.price} asc`,
          price_desc: sql`${listings.price} desc`,
          surface: sql`${propertyDetails.surfaceM2} desc nulls last`,
          confidence: sql`${listings.confidenceScore} desc nulls last`,
          compat: sql`${listings.confidenceScore} desc nulls last`,
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
      distanceM: distanceExpr
        ? sql<number>`${distanceExpr}`
        : sql<number | null>`null`,
      lexRank: textQ
        ? sql<number | null>`${lexRankExpr(textQ)}`
        : sql<number | null>`null`,
      cosine: vecLiteral
        ? sql<number | null>`cosine_similarity(${listings.embedding}, ${vecLiteral})`
        : sql<number | null>`null`,
      createdAtTs: listings.createdAt,
    })
    .from(listings)
    .innerJoin(propertyDetails, eq(propertyDetails.listingId, listings.id))
    .where(and(...conditions))
    .orderBy(orderBy)
    .limit(limit);

  // Ranking hybride (lexical + sémantique + proximité + confiance + fraîcheur).
  const now = new Date();
  const radiusKm = q.radiusKm ?? null;
  function byRelevance<
    T extends {
      lexRank: number | null;
      cosine: number | null;
      distanceM: number | null;
      confidenceScore: number | null;
      createdAtTs: Date;
    },
  >(arr: T[]): T[] {
    // Pré-calcul du score (une fois par ligne) puis tri, pour éviter de
    // recalculer dans le comparateur O(n log n) fois.
    return arr
      .map((r) => ({
        r,
        s: computeRelevanceScore(
          {
            lexRank: r.lexRank,
            cosine: r.cosine,
            distanceM: r.distanceM,
            confidence: r.confidenceScore,
            createdAt: r.createdAtTs,
          },
          { radiusKm, now },
        ),
      }))
      .sort((a, b) => b.s - a.s)
      .map(({ r }) => r);
  }
  const wantRelevance = q.sort === "relevance";

  // Declared compatibility (M5): only when the signed-in user has a profile.
  const profile = await currentProfile();
  if (!profile) {
    const ordered =
      wantRelevance || q.sort === undefined ? byRelevance(rows) : rows;
    return NextResponse.json({
      listings: ordered.map((r) => ({ ...r, compatibility: null })),
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
  } else if (wantRelevance) {
    scored = byRelevance(scored);
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

  const embCols = await embeddingColumns({
    title: input.title,
    description: input.description,
    amenities: input.amenities,
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
      ...embCols,
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
