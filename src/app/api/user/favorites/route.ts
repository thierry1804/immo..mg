import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { userFavorites } from "@/db/schema";
import { getCurrentSession } from "@/lib/auth";

export async function GET() {
  const { user } = await getCurrentSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db
    .select({ listingId: userFavorites.listingId })
    .from(userFavorites)
    .where(eq(userFavorites.userId, user.id));
  return NextResponse.json({ ids: rows.map((r) => r.listingId) });
}

export async function POST(req: Request) {
  const { user } = await getCurrentSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as { listingId?: string };
  if (!body?.listingId) {
    return NextResponse.json({ error: "listingId required" }, { status: 400 });
  }
  await db
    .insert(userFavorites)
    .values({ userId: user.id, listingId: body.listingId })
    .onConflictDoNothing();
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: Request) {
  const { user } = await getCurrentSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const listingId = url.searchParams.get("listingId");
  if (!listingId) {
    return NextResponse.json({ error: "listingId required" }, { status: 400 });
  }
  await db
    .delete(userFavorites)
    .where(
      and(
        eq(userFavorites.userId, user.id),
        eq(userFavorites.listingId, listingId),
      ),
    );
  return NextResponse.json({ ok: true });
}
