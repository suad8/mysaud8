import { NextResponse, type NextRequest } from "next/server";
import { verifySessionToken, COOKIE_NAME } from "@/server/auth/session-token";
import { db } from "@/server/db";

// يشتغل بمحرك Node.js (لا Edge) عشان نستخدم node:crypto وقاعدة البيانات
// نفسها في التحقق من الجلسة هنا وفي بقية السيرفر.
export const runtime = "nodejs";

const PUBLIC_ADMIN_PATHS = ["/admin/login"];

/**
 * الحارس الأول لصفحات /admin: يعيد الزائر غير المسجَّل لصفحة الدخول مبكراً،
 * مع التحقق من الجلسة مقابل قاعدة البيانات (حساب مفعّل + كلمة مرور لم تتغيّر).
 * ليس الحارس الوحيد: كل صفحة (requireAdminPage) وكل إجراء (requireAdmin) يتحققان بأنفسهما.
 */
/** وضع الصيانة مفعّل؟ استعلام واحد بالمفتاح الأساسي — وأي خطأ يُبقي المتجر مفتوحاً. */
async function maintenanceEnabled(): Promise<boolean> {
  try {
    const row = await db.setting.findUnique({ where: { key: "store.maintenance" }, select: { value: true } });
    return (row?.value as { enabled?: unknown } | null)?.enabled === true;
  } catch {
    return false;
  }
}

/**
 * صفحات المتجر أثناء الصيانة: الزائر يُعرض له /maintenance (برمز 503 حتى لا تفهرس
 * محركات البحث صفحة الصيانة مكان المتجر)، دون أن تُنفَّذ صفحة المتجر المطلوبة أصلاً.
 * المدير المسجّل دخوله يتصفح المتجر كالمعتاد.
 */
async function storefrontGuard(req: NextRequest) {
  if (!(await maintenanceEnabled())) return NextResponse.next();
  if (await verifySessionToken(req.cookies.get(COOKIE_NAME)?.value)) return NextResponse.next();
  return NextResponse.rewrite(new URL("/maintenance", req.url), { status: 503, headers: { "Retry-After": "3600", "Cache-Control": "no-store" } });
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!pathname.startsWith("/admin")) return storefrontGuard(req);

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
    {
      // صفحات المتجر (لوضع الصيانة) — عدا الملفات الثابتة والصور وواجهات API وصفحة الصيانة نفسها
      source: "/((?!admin|api/|_next/|maintenance|.*\\..*).*)",
      missing: [{ type: "header", key: "next-action" }],
    },
  ],
};
