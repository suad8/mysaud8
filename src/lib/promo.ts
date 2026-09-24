/** ألوان شارة العنوان الترويجي — أسماء أصناف Tailwind حرفية حتى تُولَّد في CSS. */
export const PROMO_COLORS = {
  brand: { label: "بنفسجي", className: "bg-brand-600 text-white" },
  accent: { label: "ذهبي", className: "bg-accent-500 text-on-accent" },
  red: { label: "أحمر", className: "bg-red-600 text-white" },
  green: { label: "أخضر", className: "bg-emerald-600 text-white" },
  dark: { label: "أسود", className: "bg-ink-900 text-white" },
} as const;

export type PromoColor = keyof typeof PROMO_COLORS;
export const PROMO_TITLE_MAX = 25;

export function promoClass(color: string | null | undefined): string {
  return (PROMO_COLORS[(color ?? "") as PromoColor] ?? PROMO_COLORS.brand).className;
}
