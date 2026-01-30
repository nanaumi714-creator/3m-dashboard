import { NextRequest, NextResponse } from "next/server";

const authCookieKey = "sb-auth-token";

const publicPrefixes = ["/login", "/api", "/_next", "/favicon.ico"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (publicPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  const authCookie = request.cookies.get(authCookieKey)?.value;

  if (!authCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const session = JSON.parse(decodeURIComponent(authCookie));
    if (!session?.access_token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"]
};
