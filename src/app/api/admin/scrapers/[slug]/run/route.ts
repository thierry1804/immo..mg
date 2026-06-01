import { NextResponse } from "next/server";
import { AuthError, requireAdmin } from "@/lib/auth";
import { enqueueScrape } from "@/lib/queue";
import { findScraper } from "@/scrapers/registry";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    await requireAdmin();
  } catch (e) {
    const err = e as AuthError;
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  const { slug } = await params;
  const scraper = await findScraper(slug);
  if (!scraper) {
    return NextResponse.json({ error: "Unknown source" }, { status: 404 });
  }
  if (!scraper.isEnabled()) {
    return NextResponse.json(
      { error: "Source is disabled" },
      { status: 400 },
    );
  }
  await enqueueScrape(slug);
  return NextResponse.json({ ok: true, slug });
}
