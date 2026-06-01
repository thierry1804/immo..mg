import { hash } from "@node-rs/argon2";
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

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing.length > 0) {
    return NextResponse.json(
      { error: "Email already registered" },
      { status: 409 },
    );
  }

  const hashed = await hash(password, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });
  const userId = crypto.randomUUID();
  const bootstrapAdmin =
    process.env.BOOTSTRAP_ADMIN_EMAIL &&
    process.env.BOOTSTRAP_ADMIN_EMAIL.toLowerCase() === email;
  await db.insert(users).values({
    id: userId,
    email,
    hashedPassword: hashed,
    role: bootstrapAdmin ? "admin" : "user",
  });

  const token = generateSessionToken();
  const session = await createSession(token, userId);
  await setSessionCookie(token, session.expiresAt);

  return NextResponse.json({ id: userId, email }, { status: 201 });
}
