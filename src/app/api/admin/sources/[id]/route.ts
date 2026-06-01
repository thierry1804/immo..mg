import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { scrapeSources } from "@/db/schema";
import { AuthError, requireAdmin } from "@/lib/auth";
import { scrapeSourceInputSchema } from "@/lib/validation";

async function requireAdminOrError() {
  try {
    await requireAdmin();
    return null;
  } catch (e) {
    const err = e as AuthError;
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauth = await requireAdminOrError();
  if (unauth) return unauth;
  const { id } = await params;
  const rows = await db
    .select()
    .from(scrapeSources)
    .where(eq(scrapeSources.id, id))
    .limit(1);
  if (rows.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ source: rows[0] });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauth = await requireAdminOrError();
  if (unauth) return unauth;
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = scrapeSourceInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const data = parsed.data;
  const result = await db
    .update(scrapeSources)
    .set({
      slug: data.slug,
      name: data.name,
      enabled: data.enabled,
      baseUrl: data.baseUrl,
      listUrls: data.listUrls,
      selectors: data.selectors,
      defaultTransactionType: data.defaultTransactionType ?? null,
      maxPages: data.maxPages,
      throttleMs: data.throttleMs,
      updatedAt: new Date(),
    })
    .where(eq(scrapeSources.id, id))
    .returning();
  if (result.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ source: result[0] });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const unauth = await requireAdminOrError();
  if (unauth) return unauth;
  const { id } = await params;
  const result = await db
    .delete(scrapeSources)
    .where(eq(scrapeSources.id, id))
    .returning({ id: scrapeSources.id });
  if (result.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
