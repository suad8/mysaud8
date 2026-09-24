import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";

/**
 * جلسة السلة: معرّف عشوائي بلا تسجيل دخول، محفوظ بكوكيز httpOnly، ومربوط
 * بعمود Cart.sessionId. لا حاجة لتوقيعه (HMAC) — لا يحمل صلاحيات ولا بيانات
 * حسّاسة، مجرّد مفتاح لسلة تسوّق فارغة/عامة.
 */

const CART_COOKIE = "fnjn_cart_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 90; // ٩٠ يوماً

/**
 * للاستخدام داخل Server Actions فقط (تعيين الكوكيز غير مسموح أثناء عرض
 * المكوّنات). ينشئ معرّفاً جديداً إن لم يوجد ويخزّنه.
 */
export async function getOrCreateCartSessionId(): Promise<string> {
  const jar = await cookies();
  const existing = jar.get(CART_COOKIE)?.value;
  if (existing) return existing;

  const id = randomUUID();
  await setCartSessionCookie(id);
  return id;
}

/** يربط المتصفح بسلة محددة (إنشاء سلة جديدة، أو استعادة سلة متروكة من رابط التذكير). */
export async function setCartSessionCookie(sessionId: string): Promise<void> {
  const jar = await cookies();
  jar.set(CART_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
    secure: process.env.NODE_ENV === "production",
  });
}

/** قراءة فقط بلا إنشاء — للاستخدام أثناء عرض الصفحات (سلة فارغة إن لم توجد بعد). */
export async function getCartSessionId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(CART_COOKIE)?.value ?? null;
}
