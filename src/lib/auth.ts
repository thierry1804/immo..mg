import { sha256 } from "@oslojs/crypto/sha2";
import {
  encodeBase32LowerCaseNoPadding,
  encodeHexLowerCase,
} from "@oslojs/encoding";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "@/db/client";
import { sessions, users, type Session, type User } from "@/db/schema";

const SESSION_COOKIE = "geomarket_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const RENEW_THRESHOLD_MS = 1000 * 60 * 60 * 24 * 15; // 15 days

export function generateSessionToken(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return encodeBase32LowerCaseNoPadding(bytes);
}

function sessionIdFromToken(token: string): string {
  return encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
}

export async function createSession(
  token: string,
  userId: string,
): Promise<Session> {
  const id = sessionIdFromToken(token);
  const session: Session = {
    id,
    userId,
    expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
  };
  await db.insert(sessions).values(session);
  return session;
}

export type SessionValidationResult =
  | { session: Session; user: User }
  | { session: null; user: null };

export async function validateSessionToken(
  token: string,
): Promise<SessionValidationResult> {
  const id = sessionIdFromToken(token);
  const row = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, id))
    .limit(1);
  if (row.length === 0) return { session: null, user: null };
  const { session, user } = row[0];
  if (Date.now() >= session.expiresAt.getTime()) {
    await db.delete(sessions).where(eq(sessions.id, id));
    return { session: null, user: null };
  }
  if (Date.now() >= session.expiresAt.getTime() - RENEW_THRESHOLD_MS) {
    const newExpires = new Date(Date.now() + SESSION_DURATION_MS);
    session.expiresAt = newExpires;
    await db
      .update(sessions)
      .set({ expiresAt: newExpires })
      .where(eq(sessions.id, id));
  }
  return { session, user };
}

export async function invalidateSession(sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export async function setSessionCookie(token: string, expiresAt: Date) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
    path: "/",
  });
}

export const getCurrentSession = cache(
  async (): Promise<SessionValidationResult> => {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (!token) return { session: null, user: null };
    return validateSessionToken(token);
  },
);

export const SESSION_COOKIE_NAME = SESSION_COOKIE;

export async function requireAdmin(): Promise<User> {
  const { user } = await getCurrentSession();
  if (!user) throw new AuthError("Unauthorized", 401);
  if (user.role !== "admin") throw new AuthError("Forbidden", 403);
  return user;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
