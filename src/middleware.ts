import { NextResponse, type NextRequest } from "next/server";
import { decodeSession, COOKIE_NAME } from "@/server/auth/session";

// يشتغل بمحرك Node.js (لا Edge) عشان نستخدم node:crypto نفسها في التحقق
// من الجلسة هنا وفي بقية السيرفر بلا ازدواجية أو حزم إضافية.
export const runtime = "nodejs";

const PUBLIC_ADMIN_PATHS = ["/admin/login"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const session = decodeSession(req.cookies.get(COOKIE_NAME)?.value);
  if (!session) {
    const loginUrl = new URL("/admin/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
