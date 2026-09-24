/**
 * خيارات المنتج المهيكلة (مثل سلة): مجموعات بقيم — «المقاس: 8 أونص، 9 أونص»،
 * «الكمية: 500، 1000» — وكل تركيبة من قيمها متغيّر له سعره ومخزونه.
 * ملف نقي يُستخدم في لوحة التحكم والمتجر والخادم معاً.
 */
export type OptionGroup = { name: string; values: string[] };
export type OptionSelection = Record<string, string>;

export const MAX_OPTION_GROUPS = 3;
export const MAX_OPTION_VALUES = 20;
export const MAX_COMBINATIONS = 100;
const MAX_TEXT = 40;

/** تنظيف مجموعات قادمة من النموذج أو قاعدة البيانات: أسماء وقيم غير فارغة وغير مكررة. */
export function sanitizeOptionGroups(raw: unknown): OptionGroup[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const groups: OptionGroup[] = [];
  for (const item of raw.slice(0, MAX_OPTION_GROUPS)) {
    const name = typeof item?.name === "string" ? item.name.trim().slice(0, MAX_TEXT) : "";
    if (!name || seen.has(name)) continue;
    seen.add(name);
    const values = [
      ...new Set(
        (Array.isArray(item?.values) ? item.values : [])
          .filter((v: unknown): v is string => typeof v === "string")
          .map((v: string) => v.trim().slice(0, MAX_TEXT))
          .filter(Boolean),
      ),
    ].slice(0, MAX_OPTION_VALUES) as string[];
    if (values.length > 0) groups.push({ name, values });
  }
  return groups;
}

/** كل التركيبات الممكنة بترتيب المجموعات والقيم. */
export function optionCombinations(groups: OptionGroup[]): OptionSelection[] {
  return groups.reduce<OptionSelection[]>(
    (acc, g) => acc.flatMap((combo) => g.values.map((v) => ({ ...combo, [g.name]: v }))),
    groups.length ? [{}] : [],
  );
}

/** اسم التركيبة المعروض (ويُحفظ كاسم المتغيّر): «9 أونص / 1000 حبة». */
export function optionLabel(groups: OptionGroup[], selection: OptionSelection): string {
  return groups.map((g) => selection[g.name] ?? "").join(" / ");
}

/** مفتاح ثابت للتركيبة لمطابقة الصفوف عند تعديل المجموعات. */
export function optionKey(groups: OptionGroup[], selection: OptionSelection): string {
  return JSON.stringify(groups.map((g) => selection[g.name] ?? null));
}

/** هل تحمل التركيبة قيمة صالحة من كل مجموعة (ولا شيء غيرها)؟ */
export function isValidSelection(groups: OptionGroup[], selection: unknown): selection is OptionSelection {
  if (!selection || typeof selection !== "object" || Array.isArray(selection)) return false;
  const s = selection as Record<string, unknown>;
  return Object.keys(s).length === groups.length && groups.every((g) => typeof s[g.name] === "string" && g.values.includes(s[g.name] as string));
}
