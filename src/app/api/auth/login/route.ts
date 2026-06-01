import { verify } from "@node-rs/argon2";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import {
  createSession,
  generateSessionToken,
  setSessionCookie,
} from "@/lib/auth";
import { credentialsSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = credentialsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 400 },
    );
  }
  const { email, password } = parsed.data;

  const found = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (found.length === 0) {
    return NextResponse.json(
      { error: "Invalid credentials" },
      { status: 401 },
    );
  }
  const user = found[0];
  const ok = await verify(user.hashedPassword, password);
  if (!ok) {
    return NextResponse.json(
      { error: "Invalid credentials" },
      { status: 401 },
    );
  }

  const token = generateSessionToken();
  const session = await createSession(token, user.id);
  await setSessionCookie(token, session.expiresAt);

  return NextResponse.json({ id: user.id, email: user.email });
}
