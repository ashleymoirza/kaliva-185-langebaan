import { NextResponse, type NextRequest } from "next/server";

/**
 * Next.js 16 renamed `middleware` to `proxy` (Node.js runtime).
 * This is a cheap gate on /admin — it only checks that a session cookie is
 * present. Cryptographic verification happens server-side in requireAdmin()
 * (lib/auth.ts), which re-verifies the JWT signature and expiry.
 */
export const config = { matcher: ["/admin/:path*"] };

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();

  const hasCookie = Boolean(req.cookies.get("kaliva_admin")?.value);
  if (!hasCookie) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}
