import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const KEY_LEN = 64;

/**
 * تجزئة كلمات المرور بـ scrypt المدمجة في Node — بدون أي حزمة خارجية
 * (لا مخاطر ربط أصلي native binding عند النشر). الصيغة المخزَّنة:
 * "<ملح hex>:<تجزئة hex>".
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, KEY_LEN)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, hashHex] = stored.split(":");
  if (!salt || !hashHex) return false;
  const derived = (await scryptAsync(password, salt, KEY_LEN)) as Buffer;
  const stored2 = Buffer.from(hashHex, "hex");
  if (derived.length !== stored2.length) return false;
  return timingSafeEqual(derived, stored2);
}
