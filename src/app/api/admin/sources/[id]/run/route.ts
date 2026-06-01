import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { scrapeSources } from "@/db/schema";
import { AuthError, requireAdmin } from "@/lib/auth";
import { enqueueScrape } from "@/lib/queue";

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
    .select({ slug: scrapeSources.slug, enabled: scrapeSources.enabled })
    .from(scrapeSources)
    .where(eq(scrapeSources.id, id))
    .limit(1);
  if (rows.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!rows[0].enabled) {
    return NextResponse.json(
      { error: "Source is disabled" },
      { status: 400 },
    );
  }
  await enqueueScrape(rows[0].slug);
  return NextResponse.json({ ok: true, slug: rows[0].slug });
}
