import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/client";
import { listingReports } from "@/db/schema";
import { getCurrentSession } from "@/lib/auth";

const bodySchema = z.object({
  reason: z.enum(["prix_incoherent", "photos", "doublon", "autre"]),
  detail: z.string().max(1000).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: listingId } = await params;
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const { user } = await getCurrentSession();
  await db.insert(listingReports).values({
    id: crypto.randomUUID(),
    listingId,
    userId: user?.id ?? null,
    reason: parsed.data.reason,
    detail: parsed.data.detail ?? null,
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
