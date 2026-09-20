import { headers } from "next/headers";

/** عنوان IP للطلب الحالي (خلف بروكسي المنصّة المستضيفة عادة) — لتحديد المعدّل ولسجل التدقيق. */
export async function getClientIp(): Promise<string | null> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return h.get("x-real-ip");
}
