import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { notifications } from "@/db/schema";
import { getCurrentSession } from "@/lib/auth";

export async function GET() {
  const { user } = await getCurrentSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(50);
  const unread = rows.filter((n) => !n.readAt).length;
  return NextResponse.json({ notifications: rows, unread });
}

export async function PATCH(req: Request) {
  const { user } = await getCurrentSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as {
    markAllRead?: boolean;
    id?: string;
  };
  if (body?.markAllRead) {
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(eq(notifications.userId, user.id));
    return NextResponse.json({ ok: true });
  }
  if (body?.id) {
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(eq(notifications.id, body.id), eq(notifications.userId, user.id)),
      );
  }
  return NextResponse.json({ ok: true });
}
