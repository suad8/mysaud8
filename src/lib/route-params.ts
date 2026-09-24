/**
 * Next.js يمرّر مقاطع المسار الديناميكية غير-ASCII (مثل روابط المنتجات العربية)
 * وهي ما زالت مُرمَّزة (%D9%85...)، بينما الرابط مخزَّن بالقاعدة بحروفه الأصلية —
 * فبدون فك الترميز لا يتطابق أي منتج باسم عربي ويرجع 404.
 */
export function decodeSlug(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}
