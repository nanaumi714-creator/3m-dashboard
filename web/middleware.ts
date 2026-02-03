import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const authCookie = request.cookies
    .getAll()
    .find((cookie) => cookie.name.endsWith("-auth-token"));
  const hasSession = Boolean(authCookie?.value);

  // Protect dashboard routes
  if (request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname.startsWith("/transactions") ||
    request.nextUrl.pathname.startsWith("/vendors") ||
    request.nextUrl.pathname.startsWith("/categories") ||
    request.nextUrl.pathname.startsWith("/receipts") ||
    request.nextUrl.pathname.startsWith("/reports") ||
    request.nextUrl.pathname.startsWith("/templates") ||
    request.nextUrl.pathname.startsWith("/gmail") ||
    request.nextUrl.pathname.startsWith("/duplicates")) {

    if (!hasSession) {
      // Check for auth bypass in local development
      if (process.env.NEXT_PUBLIC_DISABLE_AUTH === "true") {
        return res;
      }

      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Redirect authenticated users away from auth pages
  if (hasSession && (
    request.nextUrl.pathname === "/login" ||
    request.nextUrl.pathname === "/signup"
  )) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return res;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/transactions/:path*",
    "/vendors/:path*",
    "/categories/:path*",
    "/receipts/:path*",
    "/reports/:path*",
    "/templates/:path*",
    "/gmail/:path*",
    "/duplicates/:path*",
    "/login",
    "/signup",
  ],
};
