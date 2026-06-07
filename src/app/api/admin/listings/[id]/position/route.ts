import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { listings } from "@/db/schema";
import { AuthError, requireAdmin } from "@/lib/auth";
import { resolveFokontany } from "@/lib/fokontany";
import { resolveListingLocation } from "@/lib/listing-location";

// Bornes Madagascar (large) pour rejeter une position aberrante.
const MG_BOUNDS = { minLng: 42, maxLng: 51, minLat: -26, maxLat: -11 };

const bodySchema = z.union([
  z.object({ reset: z.literal(true) }),
  z.object({
    lng: z.number().min(MG_BOUNDS.minLng).max(MG_BOUNDS.maxLng),
    lat: z.number().min(MG_BOUNDS.minLat).max(MG_BOUNDS.maxLat),
  }),
]);

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
  } catch (e) {
    const err = e as AuthError;
    return NextResponse.json({ error: err.message }, { status: err.status });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Coordonnées invalides" }, { status: 400 });
  }

  // Réinitialisation : on relance le géocodage automatique et on déverrouille.
  if ("reset" in parsed.data) {
    const rows = await db
      .select({
        id: listings.id,
        title: listings.title,
        description: listings.description,
        address: listings.address,
      })
      .from(listings)
      .where(eq(listings.id, id))
      .limit(1);
    if (rows.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const located = await resolveListingLocation({
      title: rows[0].title,
      description: rows[0].description,
      address: rows[0].address,
    });
    if (!located) {
      return NextResponse.json(
        { error: "Géocodage automatique impossible pour cette annonce." },
        { status: 422 },
      );
    }
    const updated = await db
      .update(listings)
      .set({
        location: { lng: located.lng, lat: located.lat },
        fokontany: located.fokontany,
        address: located.address,
        locationManual: false,
      })
      .where(eq(listings.id, id))
      .returning({ id: listings.id });
    if (updated.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      manual: false,
      lng: located.lng,
      lat: located.lat,
      fokontany: located.fokontany,
    });
  }

  // Position manuelle : on enregistre le point exact et on verrouille.
  const { lng, lat } = parsed.data;
  const fokontany = resolveFokontany(lng, lat);
  const updated = await db
    .update(listings)
    .set({
      location: { lng, lat },
      fokontany,
      locationManual: true,
    })
    .where(eq(listings.id, id))
    .returning({ id: listings.id });
  if (updated.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, manual: true, lng, lat, fokontany });
}
