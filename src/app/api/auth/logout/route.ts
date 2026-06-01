import { NextResponse } from "next/server";
import {
  clearSessionCookie,
  getCurrentSession,
  invalidateSession,
} from "@/lib/auth";

export async function POST() {
  const { session } = await getCurrentSession();
  if (session) await invalidateSession(session.id);
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
