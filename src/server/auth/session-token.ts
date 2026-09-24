import { createHmac, timingSafeEqual } from "node:crypto";
import type { AdminRole } from "@prisma/client";
import { db } from "@/server/db";

/**
 * رمز الجلسة الموقَّع: base64url(payload).base64url(HMAC-SHA256(payload)).
 *
 * التوقيع وحده لا يكفي: يُتحقَّق من كل طلب مقابل قاعدة البيانات — الحساب
 * موجود ومفعّل، وكلمة مروره لم تتغيّر منذ إصدار الجلسة (بصمة `pv`) — ويُقرأ
 * الدور والاسم من القاعدة لا من الكوكي. بهذا يُنهي تعطيلُ الحساب أو تغييرُ
 * كلمة المرور كلَّ الجلسات المفتوحة فوراً، وتغيير SESSION_SECRET يُنهي الجميع.
 *
 * منفصل عن session.ts (لا يستورد next/headers ولا react) ليستخدمه الميدلوير.
 */

export const COOKIE_NAME = process.env.NODE_ENV === "production" ? "__Host-gp_admin_session" : "gp_admin_session";
export const MAX_AGE_SECONDS = 60 * 60 * 24 * 3; // ٣ أيام

type SessionToken = {
  sub: string; // معرّف المستخدم الإداري
  pv: string; // بصمة كلمة المرور وقت الدخول
  exp: number; // وقت الانتهاء (ms epoch)
};

/** الجلسة بعد التحقق — الدور والاسم من قاعدة البيانات. */
export type SessionPayload = {
  sub: string;
  role: AdminRole;
  name: string;
  exp: number;
};

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    // فشل واضح بدل جلسة قابلة للتزوير بمفتاح فارغ/قصير
    throw new Error("SESSION_SECRET غير مضبوط أو أقصر من 32 حرفاً — لا يمكن إصدار جلسات آمنة");
  }
  return secret;
}

function hmac(value: string): string {
  return createHmac("sha256", getSecret()).update(value).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** بصمة غير قابلة للعكس لتجزئة كلمة المرور — تتغيّر بتغيّرها فتُبطل الجلسات القديمة. */
function passwordFingerprint(passwordHash: string): string {
  return hmac(`pv:${passwordHash}`).slice(0, 22);
}

export function createSessionToken(user: { id: string; passwordHash: string }): string {
  const data: SessionToken = { sub: user.id, pv: passwordFingerprint(user.passwordHash), exp: Date.now() + MAX_AGE_SECONDS * 1000 };
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  return `${payload}.${hmac(payload)}`;
}

function decodeSessionToken(token: string | undefined | null): SessionToken | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature || !safeEqual(signature, hmac(payload))) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<SessionToken>;
    if (typeof data.sub !== "string" || typeof data.pv !== "string" || typeof data.exp !== "number") return null;
    if (data.exp < Date.now()) return null;
    return data as SessionToken;
  } catch {
    return null;
  }
}

export async function verifySessionToken(token: string | undefined | null): Promise<SessionPayload | null> {
  const data = decodeSessionToken(token);
  if (!data) return null;

  const user = await db.adminUser.findUnique({
    where: { id: data.sub },
    select: { id: true, name: true, role: true, isActive: true, passwordHash: true },
  });
  if (!user || !user.isActive || !safeEqual(data.pv, passwordFingerprint(user.passwordHash))) return null;

  return { sub: user.id, role: user.role, name: user.name, exp: data.exp };
}
