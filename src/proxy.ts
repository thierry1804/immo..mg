import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "geomarket_session";
/** Session tokens are base32 (a-z2-7), 32 chars from 20 random bytes. */
const TOKEN_RE = /^[a-z2-7]{32}$/;

export function proxy(request: NextRequest) {
  const raw = request.cookies.get(SESSION_COOKIE)?.value?.trim();
  if (!raw || !TOKEN_RE.test(raw)) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/listings/new"],
};
