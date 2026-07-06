// Edge-safe middleware: ověřuje JWT bez DB přístupu (Auth.js v5 + next-auth/jwt).
// DB-dependent kontrola se děje v RSC/route handlerech přes getOptionalUser().

import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

const protectedPaths = ["/dashboard", "/admin"];

export default async function middleware(req: NextRequest) {
  const url = req.url ? new URL(req.url) : null;
  if (!url) return NextResponse.next();
  const { pathname } = url;

  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const token = await getToken({
    req: req as never,
    secret: process.env.AUTH_SECRET,
    // Sůl z procesu (Auth.js v5 ho odvozuje z NEXTAUTH_URL / AUTH_URL)
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

  // Bezpečnostní hlavičky pro všechny chráněné stránky
  const response = NextResponse.next();
  response.headers.set("X-Protected-By", "middleware");
  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
};