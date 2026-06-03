import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { listings } from "@/db/schema";
import { fetchListingDetail } from "@/lib/listing-detail";
import { getCurrentSession } from "@/lib/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const listing = await fetchListingDetail(id);
  if (!listing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ listing });
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
