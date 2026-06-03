import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { reverseGeocode } from "@/lib/reverse-geocode";

const querySchema = z.object({
  lng: z.coerce.number().min(-180).max(180),
  lat: z.coerce.number().min(-90).max(90),
});

export async function GET(req: Request) {
  const limited = await enforceRateLimit(req, "geocode-reverse", 30, 60);
  if (limited) return limited;

  const { user } = await getCurrentSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    lng: url.searchParams.get("lng"),
    lat: url.searchParams.get("lat"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
  }
  const address = await reverseGeocode(parsed.data.lng, parsed.data.lat);
  return NextResponse.json({ address });
}
