/**
 * يحوّل كائناً إلى JSON-LD آمن للتضمين داخل <script type="application/ld+json">.
 * يعطّل "<" كي لا ينهي وسم السكربت مبكراً إن احتوى نص من المستخدم (اسم/وصف
 * منتج) على "</script>" حرفياً — حماية معيارية عند حقن JSON داخل HTML.
 */
export function toJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
