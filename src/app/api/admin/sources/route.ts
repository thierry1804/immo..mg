import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { BUILTIN_SOURCE_SLUGS, scrapeSources } from "@/db/schema";
import { AuthError, requireAdmin } from "@/lib/auth";
import { scrapeSourceInputSchema } from "@/lib/validation";

export async function GET() {
  try {
    await requireAdmin();
  } catch (e) {
    const err = e as AuthError;
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  const rows = await db
    .select()
    .from(scrapeSources)
    .orderBy(desc(scrapeSources.createdAt));
  return NextResponse.json({ sources: rows });
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
  } catch (e) {
    const err = e as AuthError;
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  const body = await req.json().catch(() => null);
  const parsed = scrapeSourceInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const data = parsed.data;
  if ((BUILTIN_SOURCE_SLUGS as readonly string[]).includes(data.slug)) {
    return NextResponse.json(
      { error: `Slug "${data.slug}" is reserved` },
      { status: 409 },
    );
  }
  try {
    const [row] = await db
      .insert(scrapeSources)
      .values({
        id: crypto.randomUUID(),
        slug: data.slug,
        name: data.name,
        enabled: data.enabled,
        baseUrl: data.baseUrl,
        listUrls: data.listUrls,
        selectors: data.selectors,
        defaultTransactionType: data.defaultTransactionType ?? null,
        maxPages: data.maxPages,
        throttleMs: data.throttleMs,
      })
      .returning();
    return NextResponse.json({ source: row }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && /unique/i.test(err.message)) {
      return NextResponse.json(
        { error: "Slug already taken" },
        { status: 409 },
      );
    }
    throw err;
  }
}
