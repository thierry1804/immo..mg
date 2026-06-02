import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { userProfiles } from "@/db/schema";
import { getCurrentSession } from "@/lib/auth";
import { userProfileSchema } from "@/lib/validation";

export async function GET() {
  const { user } = await getCurrentSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rows = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, user.id))
    .limit(1);
  return NextResponse.json({ profile: rows[0] ?? null });
}

export async function PUT(req: Request) {
  const { user } = await getCurrentSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const parsed = userProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const p = parsed.data;
  const values = {
    userId: user.id,
    budgetMin: p.budgetMin ?? null,
    budgetMax: p.budgetMax ?? null,
    transactionType: p.transactionType ?? null,
    quartiers: p.quartiers,
    mustHave: p.mustHave,
    propertyTypes: p.propertyTypes,
    minSurface: p.minSurface ?? null,
    alertThreshold: p.alertThreshold,
    updatedAt: new Date(),
  };
  await db
    .insert(userProfiles)
    .values(values)
    .onConflictDoUpdate({ target: userProfiles.userId, set: values });

  return NextResponse.json({ ok: true });
}
