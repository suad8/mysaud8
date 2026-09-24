/** يحوّل الاسم العربي/اللاتيني إلى رابط صالح — يحافظ على الحروف والأرقام فقط. */
export function slugify(input: string, fallbackPrefix = "item"): string {
  const base = input
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return base || `${fallbackPrefix}-${Date.now()}`;
}

/** يضيف لاحقة رقمية حتى يصبح الرابط غير مستخدم. */
export async function uniqueSlug(base: string, exists: (slug: string) => Promise<boolean>): Promise<string> {
  let slug = base;
  let i = 1;
  while (await exists(slug)) {
    i += 1;
    slug = `${base}-${i}`;
  }
  return slug;
}
