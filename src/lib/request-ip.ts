import { headers } from "next/headers";
import { isIP } from "node:net";

/** عناوين داخلية/خاصة — تخص بروكسيات المنصّة لا الزائر. */
function isPrivateIp(ip: string): boolean {
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number) as [number, number];
    return a === 10 || a === 127 || a === 0 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254);
  }
  const lower = ip.toLowerCase();
  return lower === "::1" || lower === "::" || lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80");
}

/**
 * عنوان IP للزائر (لتحديد المعدّل ولسجل التدقيق).
 *
 * لا يُؤخذ أول عنصر في X-Forwarded-For: الزائر يستطيع كتابته بنفسه فيتجاوز
 * أي حدّ للمحاولات بتغييره في كل طلب. بدلاً من ذلك:
 *  1. X-Real-IP — تضبطه حافة Railway بعنوان الاتصال الفعلي.
 *  2. وإلا فآخر عنوان عام في X-Forwarded-For (ما أضافه البروكسي الموثوق، لا الزائر).
 */
export async function getClientIp(): Promise<string | null> {
  const h = await headers();

  const realIp = h.get("x-real-ip")?.trim();
  if (realIp && isIP(realIp)) return realIp;

  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded.split(",").map((s) => s.trim()).filter((s) => isIP(s));
    for (let i = hops.length - 1; i >= 0; i--) {
      if (!isPrivateIp(hops[i]!)) return hops[i]!;
    }
  }
  return null;
}
