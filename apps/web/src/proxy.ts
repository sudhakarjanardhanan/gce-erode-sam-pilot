import { auth } from "@/lib/auth/auth";
import { NextResponse } from "next/server";

// Routes that require authentication
const PROTECTED_PREFIXES = ["/admin", "/reports", "/mentors"];

// Routes that are only accessible when NOT authenticated
const AUTH_ONLY_PATHS = ["/login"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default auth((req: any) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Redirect logged-in users away from login page
  if (AUTH_ONLY_PATHS.some((p) => pathname.startsWith(p)) && session) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Redirect unauthenticated users to login
  if (PROTECTED_PREFIXES.some((p) => pathname.startsWith(p)) && !session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin-only routes
  if (pathname.startsWith("/admin")) {
    const roles: string[] = (session?.user?.roles as string[]) ?? [];
    if (!roles.includes("ADMIN")) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Run on all routes except static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico|api/auth).*)",
  ],
};
