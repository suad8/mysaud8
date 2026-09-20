import { TAX_RATE } from "@/lib/constants";

/**
 * حساب إجماليات السلة/الطلب في مكان واحد.
 *
 * الأسعار المعروضة في المتجر شاملة ضريبة القيمة المضافة (المعيار في السعودية)،
 * لذلك الضريبة تُستخرج من الإجمالي ولا تُضاف فوقه. عرضها منفصلة مطلوب في
 * الفاتورة، لكنها لا تغيّر المبلغ الذي يدفعه العميل.
 */

export type PriceableLine = {
  unitPrice: number;
  quantity: number;
};

export type DiscountInput =
  | { type: "PERCENTAGE"; value: number; maxDiscount?: number | null }
  | { type: "FIXED"; value: number }
  | { type: "FREE_SHIPPING" };

export type Totals = {
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  /** الضريبة المستخرَجة من الإجمالي — للعرض في الفاتورة فقط */
  taxTotal: number;
  grandTotal: number;
  itemCount: number;
};

/** تقريب لهللتين — كل خطوة حسابية تُقرَّب حتى لا تتراكم فروق الكسور. */
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function calculateTotals(args: {
  lines: PriceableLine[];
  discount?: DiscountInput | null;
  shippingRate?: number;
  freeShippingAbove?: number | null;
}): Totals {
  const { lines, discount, shippingRate = 0, freeShippingAbove } = args;

  const subtotal = round2(
    lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0),
  );
  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);

  let discountTotal = 0;
  let shippingFree = false;

  if (discount) {
    if (discount.type === "PERCENTAGE") {
      discountTotal = round2((subtotal * discount.value) / 100);
      if (discount.maxDiscount != null) {
        discountTotal = Math.min(discountTotal, discount.maxDiscount);
      }
    } else if (discount.type === "FIXED") {
      discountTotal = Math.min(discount.value, subtotal);
    } else {
      shippingFree = true;
    }
  }

  const afterDiscount = round2(subtotal - discountTotal);

  if (freeShippingAbove != null && afterDiscount >= freeShippingAbove) {
    shippingFree = true;
  }
  const shippingTotal = shippingFree ? 0 : round2(shippingRate);

  const grandTotal = round2(afterDiscount + shippingTotal);
  // الأسعار شاملة الضريبة: الضريبة = الإجمالي × (النسبة ÷ (١ + النسبة))
  const taxTotal = round2(grandTotal * (TAX_RATE / (1 + TAX_RATE)));

  return { subtotal, discountTotal, shippingTotal, taxTotal, grandTotal, itemCount };
}
