import { auth } from "~/server/auth/config";
import { NextResponse } from "next/server";

const protectedPaths = ["/dashboard", "/admin"];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  if (!req.auth) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth/signin";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  // Admin guard
  if (pathname.startsWith("/admin")) {
    const role = (req.auth.user as { role?: string })?.role ?? "user";
    if (role !== "admin" && role !== "curator") {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};