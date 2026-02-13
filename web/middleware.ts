import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { Database } from "@/lib/database.types";

const LAST_SEEN_COOKIE = "last_seen";
const REVISIT_RESET_HOURS = Number(process.env.REVISIT_RESET_HOURS ?? "24");
const REVISIT_RESET_MS = REVISIT_RESET_HOURS * 60 * 60 * 1000;

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/transactions",
  "/vendors",
  "/categories",
  "/receipts",
  "/reports",
  "/templates",
  "/gmail",
  "/duplicates",
  "/expenses",
  "/triage",
  "/imports",
  "/balance",
  "/accounts",
  "/payment-methods",
  "/transfers",
  "/exports",
  "/mobile",
];

function setLastSeenCookie(response: NextResponse, now: number) {
  response.cookies.set({
    name: LAST_SEEN_COOKIE,
    value: String(now),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

function isProtectedPath(pathname: string) {
  return pathname === "/" || PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest) {
  const now = Date.now();
  const pathname = request.nextUrl.pathname;
  const res = NextResponse.next();
  setLastSeenCookie(res, now);

  const supabase = createMiddlewareClient<Database>({ req: request, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const hasSession = Boolean(session);
  const isProtected = isProtectedPath(pathname);

  // Protect dashboard routes
  if (isProtected) {

    if (!hasSession) {
      // Check for auth bypass in local development
      if (process.env.NEXT_PUBLIC_DISABLE_AUTH === "true") {
        return res;
      }

      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("redirectTo", pathname);

      const redirectResponse = NextResponse.redirect(redirectUrl);
      setLastSeenCookie(redirectResponse, now);
      return redirectResponse;
    }

    if (pathname !== "/") {
      const lastSeenRaw = request.cookies.get(LAST_SEEN_COOKIE)?.value;
      const lastSeen = Number(lastSeenRaw);
      const shouldResetToHome = Number.isFinite(lastSeen) && now - lastSeen >= REVISIT_RESET_MS;

      if (shouldResetToHome) {
        const redirectResponse = NextResponse.redirect(new URL("/", request.url));
        setLastSeenCookie(redirectResponse, now);
        return redirectResponse;
      }
    }
  }

  // Redirect authenticated users away from auth pages
  if (hasSession && (
    pathname === "/login" ||
    pathname === "/signup"
  )) {
    const redirectResponse = NextResponse.redirect(new URL("/", request.url));
    setLastSeenCookie(redirectResponse, now);
    return redirectResponse;
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|manifest.webmanifest|sw.js|api/).*)",
  ],
};
