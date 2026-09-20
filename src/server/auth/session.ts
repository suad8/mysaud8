import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * جلسات موقّعة بلا حالة (stateless) — لا تُخزَّن في قاعدة البيانات.
 * القيمة: base64url(payload).base64url(HMAC-SHA256(payload)).
 * لا تعتمد على أي حزمة خارجية (crypto مدمجة في Node).
 */

const COOKIE_NAME = "fnjn_admin_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // أسبوع

export type SessionPayload = {
  sub: string; // معرّف المستخدم الإداري
  role: string;
  name: string;
  exp: number; // وقت الانتهاء (ms epoch)
};

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    // فشل واضح بدل جلسة قابلة للتزوير بمفتاح فارغ/متوقَّع
    throw new Error("SESSION_SECRET غير مضبوط — لا يمكن إصدار جلسات آمنة بدونه");
  }
  return secret;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function encodeSession(data: SessionPayload): string {
  const payload = b64url(JSON.stringify(data));
  return `${payload}.${sign(payload)}`;
}

export function decodeSession(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionPayload;
    if (typeof data.exp !== "number" || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export async function setSessionCookie(data: Omit<SessionPayload, "exp">) {
  const jar = await cookies();
  const exp = Date.now() + MAX_AGE_SECONDS * 1000;
  jar.set(COOKIE_NAME, encodeSession({ ...data, exp }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  return decodeSession(jar.get(COOKIE_NAME)?.value);
}

/**
 * حارس دفاع إضافي (defense-in-depth) داخل الإجراءات الحسّاسة — الحارس
 * الأساسي هو middleware.ts، لكن هذا يمنع أي تنفيذ لو وصل الطلب من
 * مسار لم يغطّه الميدلوير لأي سبب مستقبلي (إعادة هيكلة، إلخ).
 */
export async function requireAdmin(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    throw new Error("غير مصرَّح — الرجاء تسجيل الدخول");
  }
  return session;
}

export { COOKIE_NAME };
