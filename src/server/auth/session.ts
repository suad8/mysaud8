import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminRole } from "@prisma/client";
import { COOKIE_NAME, MAX_AGE_SECONDS, createSessionToken, verifySessionToken, type SessionPayload } from "@/server/auth/session-token";

/**
 * جلسات لوحة التحكم — الكوكي موقَّع، وكل طلب يُتحقَّق منه مقابل قاعدة
 * البيانات (انظر session-token.ts). لا تعتمد على أي حزمة خارجية.
 */

export type { SessionPayload };

export async function setSessionCookie(user: { id: string; passwordHash: string }) {
  const jar = await cookies();
  jar.set(COOKIE_NAME, createSessionToken(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  // كوكي __Host- لا يُحذف إلا بنفس خصائصه (Secure + path=/)
  jar.set(COOKIE_NAME, "", { path: "/", maxAge: 0, httpOnly: true, secure: process.env.NODE_ENV === "production" });
}

/** مُخزَّنة لكل طلب (React cache) — التخطيط والصفحة والإجراء يتشاركون استعلاماً واحداً. */
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const jar = await cookies();
  return verifySessionToken(jar.get(COOKIE_NAME)?.value);
});

/**
 * حارس كل إجراء إداري على الخادم — لا يُكتفى بالميدلوير ولا بإخفاء الأزرار
 * بالواجهة: الإجراءات (Server Actions) نقاط نهاية يمكن استدعاؤها مباشرة.
 */
export async function requireAdmin(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new Error("غير مصرَّح — الرجاء تسجيل الدخول");
  }
  return session;
}

/**
 * أول سطر في كل صفحة إدارية — لا يُكتفى بالتخطيط (layout): التنقّل الداخلي
 * يجلب الصفحة وحدها دون إعادة تشغيل التخطيط. مُخزَّنة لكل طلب فلا تكلف استعلاماً إضافياً.
 */
export async function requireAdminPage(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}

/** للإجراءات الحسّاسة: إدارة المستخدمين، بيانات الدفع والحساب البنكي، سكربتات التتبّع. */
export async function requireOwner(): Promise<SessionPayload> {
  const session = await requireAdmin();
  if (session.role !== AdminRole.OWNER) {
    throw new Error("هذا الإجراء متاح لحساب المالك فقط");
  }
  return session;
}

export { COOKIE_NAME };
