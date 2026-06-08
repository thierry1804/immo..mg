import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { listings } from "@/db/schema";
import { AuthError, requireAdmin } from "@/lib/auth";
import {
  markConfidenceCheck,
  scoreFromBreakdown,
  type ConfidenceCheck,
} from "@/lib/confidence";
import { resolveListingLocation } from "@/lib/listing-location";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
  } catch (e) {
    const err = e as AuthError;
    return NextResponse.json({ error: err.message }, { status: err.status });
  }

  const { id } = await params;
  const rows = await db
    .select({
      id: listings.id,
      title: listings.title,
      description: listings.description,
      address: listings.address,
      fokontany: listings.fokontany,
      locationManual: listings.locationManual,
      confidenceBreakdown: listings.confidenceBreakdown,
    })
    .from(listings)
    .where(eq(listings.id, id))
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const row = rows[0];

  // Position fixée manuellement par l'admin → on la conserve telle quelle.
  // Sinon on (re)calcule la meilleure position depuis le texte de l'annonce.
  let fokontany = row.fokontany;
  const set: Partial<typeof listings.$inferInsert> = {
    status: "active",
  };
  if (!row.locationManual) {
    const located = await resolveListingLocation({
      title: row.title,
      description: row.description,
      address: row.address,
    });
    if (!located) {
      return NextResponse.json(
        {
          error:
            "Impossible de localiser le bien. Placez-le manuellement sur la carte puis réessayez.",
        },
        { status: 422 },
      );
    }
    fokontany = located.fokontany;
    set.address = located.address;
    set.fokontany = located.fokontany;
    set.location = { lng: located.lng, lat: located.lat };
    set.geoConfidence = located.confidence;
    set.geoSource = located.source;
  }

  let breakdown = (row.confidenceBreakdown ?? []) as ConfidenceCheck[];
  if (fokontany) {
    breakdown = markConfidenceCheck(breakdown, "fokontany");
  }
  set.confidenceBreakdown = breakdown;
  set.confidenceScore = scoreFromBreakdown(breakdown);

  const result = await db
    .update(listings)
    .set(set)
    .where(eq(listings.id, id))
    .returning({
      id: listings.id,
      fokontany: listings.fokontany,
      lng: sql<number>`ST_X(${listings.location}::geometry)`,
      lat: sql<number>`ST_Y(${listings.location}::geometry)`,
    });

  return NextResponse.json({ ok: true, location: result[0] });
}
