const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY ?? "SAR";

const money = new Intl.NumberFormat("ar-SA", {
  style: "decimal",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  numberingSystem: "latn",
});

const compact = new Intl.NumberFormat("ar-SA", {
  notation: "compact",
  maximumFractionDigits: 1,
  numberingSystem: "latn",
});

const counter = new Intl.NumberFormat("ar-SA", { numberingSystem: "latn" });

/** يعيد المبلغ بدون رمز العملة — الرمز يُعرض كعنصر منفصل ليأخذ تنسيقه الخاص. */
export function formatAmount(value: number | string): string {
  return money.format(typeof value === "string" ? Number(value) : value);
}

export function formatPrice(value: number | string): string {
  return `${formatAmount(value)} ${CURRENCY === "SAR" ? "ر.س" : CURRENCY}`;
}

export function formatCompact(value: number): string {
  return compact.format(value);
}

export function formatNumber(value: number): string {
  return counter.format(value);
}

const dateFmt = new Intl.DateTimeFormat("ar-SA", {
  dateStyle: "medium",
  numberingSystem: "latn",
  calendar: "gregory",
});

const dateTimeFmt = new Intl.DateTimeFormat("ar-SA", {
  dateStyle: "medium",
  timeStyle: "short",
  numberingSystem: "latn",
  calendar: "gregory",
});

export function formatDate(value: Date | string): string {
  return dateFmt.format(new Date(value));
}

export function formatDateTime(value: Date | string): string {
  return dateTimeFmt.format(new Date(value));
}

/** "منذ ٣ ساعات" — للقوائم الحديثة في لوحة التحكم. */
export function formatRelative(value: Date | string): string {
  const rtf = new Intl.RelativeTimeFormat("ar", { numeric: "auto" });
  const diffMs = new Date(value).getTime() - Date.now();
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31_536_000_000],
    ["month", 2_592_000_000],
    ["day", 86_400_000],
    ["hour", 3_600_000],
    ["minute", 60_000],
  ];
  for (const [unit, ms] of units) {
    if (Math.abs(diffMs) >= ms) return rtf.format(Math.round(diffMs / ms), unit);
  }
  return rtf.format(Math.round(diffMs / 1000), "second");
}

export function discountPercent(price: number, comparePrice: number): number {
  if (comparePrice <= price) return 0;
  return Math.round(((comparePrice - price) / comparePrice) * 100);
}
