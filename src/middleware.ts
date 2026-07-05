// Edge-safe middleware: ověřuje JWT bez DB přístupu (Auth.js v5 + next-auth/jwt).
// DB-dependent kontrola se děje v RSC/route handlerech přes getOptionalUser().

import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

const protectedPaths = ["/dashboard", "/admin"];

export default async function middleware(req: Request) {
  const url = new URL(req.url);
  const { pathname } = url;

  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const token = await getToken({
    req: req as never,
    secret: process.env.AUTH_SECRET,
    // SalteR z procesu (Auth.js v5 ho odvozuje z NEXTAUTH_URL / AUTH_URL)
    salt: "authjs.session-token",
  });

  if (!token) {
    const redirect = new URL("/auth/signin", url);
    redirect.searchParams.set("from", pathname);
    return NextResponse.redirect(redirect);
  }

  // Admin guard — pouze role check z JWT, bez DB
  if (pathname.startsWith("/admin")) {
    const role = (token as { role?: string }).role ?? "user";
    if (role !== "admin" && role !== "curator") {
      return NextResponse.redirect(new URL("/", url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};