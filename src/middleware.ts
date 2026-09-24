import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/server/auth/session-token";

// يشتغل بمحرك Node.js (لا Edge) عشان نستخدم node:crypto وقاعدة البيانات
// نفسها في التحقق من الجلسة هنا وفي بقية السيرفر.
export const runtime = "nodejs";

const PUBLIC_ADMIN_PATHS = ["/admin/login"];

/**
 * الحارس الأول لصفحات /admin: يعيد الزائر غير المسجَّل لصفحة الدخول مبكراً،
 * مع التحقق من الجلسة مقابل قاعدة البيانات (حساب مفعّل + كلمة مرور لم تتغيّر).
 * ليس الحارس الوحيد: كل صفحة (requireAdminPage) وكل إجراء (requireAdmin) يتحققان بأنفسهما.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_ADMIN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);
  if (!session) {
    const loginUrl = new URL("/admin/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    const res = NextResponse.redirect(loginUrl);
    if (token) {
      // كوكي __Host- لا يُحذف إلا بنفس خصائصه (Secure + path=/)
      res.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0, httpOnly: true, secure: process.env.NODE_ENV === "production" });
    }
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    {
      source: "/admin/:path*",
      // طلبات Server Actions (الحفظ ورفع الملفات) لا تمر بالميدلوير: Next.js 15 بمحرك
      // Node ينسخ جسم الطلب للميدلوير دون انتظار اكتمال النسخ، فتضيع بداية النماذج
      // الكبيرة (صور أكبر من ~1MB) ويفشل الحفظ عشوائياً. كل إجراء يتحقق بنفسه
      // (requireAdmin/requireOwner)، وكل صفحة تتحقق بـ requireAdminPage.
      missing: [{ type: "header", key: "next-action" }],
    },
  ],
};
