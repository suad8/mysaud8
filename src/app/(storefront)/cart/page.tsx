import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Price } from "@/components/ui/Price";
import { CouponForm } from "@/components/storefront/CouponForm";
import { calculateTotals } from "@/server/cart/pricing";
import { getCartCouponCode, getCartLines } from "@/server/cart/queries";
import { decrementCartItemAction, incrementCartItemAction, removeCartItemAction } from "@/server/cart/actions";
import { validateCoupon, couponToDiscountInput } from "@/server/discounts/validate";
import { getActiveShippingZones } from "@/server/shipping/queries";

export default async function CartPage() {
  const [lines, couponCode, zones] = await Promise.all([getCartLines(), getCartCouponCode(), getActiveShippingZones()]);

  if (lines.length === 0) {
    return (
      <div className="mx-auto flex max-w-7xl flex-col items-center px-4 py-24 text-center">
        <p className="text-lg font-semibold">سلتك فارغة</p>
        <p className="mt-2 text-sm text-muted">أضف بعض المنتجات لتظهر هنا.</p>
        <Button href="/" className="mt-6">تصفّح المتجر</Button>
      </div>
    );
  }

  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const couponResult = couponCode ? await validateCoupon(couponCode, subtotal) : null;
  const validCoupon = couponResult && "coupon" in couponResult ? couponResult.coupon : null;

  // تقدير الشحن هنا فقط للعرض التقريبي (لا نعرف مدينة العميل بعد) — يُحسَم فعلياً بصفحة الدفع
  const defaultRate = zones[0]?.rates[0] ?? null;
  const totals = calculateTotals({
    lines,
    discount: validCoupon ? couponToDiscountInput(validCoupon) : null,
    shippingRate: defaultRate?.price ?? 0,
    freeShippingAbove: defaultRate?.freeAbove ?? null,
  });
  const remainingForFreeShipping = defaultRate?.freeAbove != null ? Math.max(0, defaultRate.freeAbove - totals.subtotal) : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">سلة التسوّق</h1>

      {remainingForFreeShipping > 0 && (
        <div className="mt-4 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800 dark:bg-brand-950 dark:text-brand-300">
          أضف <Price value={remainingForFreeShipping} className="inline-flex" /> إضافية لتحصل على شحن مجاني 🎉
        </div>
      )}

      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {lines.map((line) => (
            <div key={line.itemId} className="surface-card flex gap-4 p-4">
              <Link href={`/p/${line.slug}`} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-[var(--surface-sunken)]">
                <Image src={line.imageUrl} alt={line.nameAr} fill sizes="96px" className="object-cover" />
              </Link>
              <div className="flex flex-1 flex-col justify-between">
                <div className="flex justify-between gap-3">
                  <div>
                    <Link href={`/p/${line.slug}`} className="text-sm font-semibold hover:underline">{line.nameAr}</Link>
                    {line.optionsLabel && <p className="mt-0.5 text-xs text-muted">{line.optionsLabel}</p>}
                    {line.quantity > line.available && (
                      <p className="mt-0.5 text-xs text-red-600">المتاح الآن {line.available} فقط</p>
                    )}
                  </div>
                  <form action={removeCartItemAction.bind(null, line.itemId)}>
                    <button type="submit" className="text-xs text-muted hover:text-red-600" aria-label="إزالة">إزالة</button>
                  </form>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex h-9 items-center rounded-lg border">
                    <form action={decrementCartItemAction.bind(null, line.itemId)}>
                      <button type="submit" className="w-9 text-muted" aria-label="إنقاص">−</button>
                    </form>
                    <span className="num w-7 text-center text-sm">{line.quantity}</span>
                    <form action={incrementCartItemAction.bind(null, line.itemId)}>
                      <button type="submit" disabled={line.quantity >= line.available} className="w-9 text-muted disabled:opacity-30" aria-label="زيادة">+</button>
                    </form>
                  </div>
                  <Price value={line.unitPrice * line.quantity} />
                </div>
              </div>
            </div>
          ))}

          <Link href="/" className="inline-block text-sm font-medium text-brand-700 hover:underline">
            ← متابعة التسوّق
          </Link>
        </div>

        {/* ملخص الطلب */}
        <aside className="surface-card h-fit p-5">
          <h2 className="text-sm font-semibold">ملخص الطلب</h2>

          <div className="mt-4">
            <CouponForm appliedCode={validCoupon?.code ?? null} />
          </div>

          <dl className="mt-5 space-y-2.5 border-t pt-5 text-sm">
            <div className="flex justify-between"><dt className="text-muted">المجموع الفرعي</dt><dd><Price value={totals.subtotal} /></dd></div>
            {totals.discountTotal > 0 && (
              <div className="flex justify-between text-brand-700"><dt>الخصم</dt><dd>−<Price value={totals.discountTotal} /></dd></div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted">الشحن (تقديري)</dt>
              <dd>{totals.shippingTotal === 0 ? <span className="text-brand-700">مجاني</span> : <Price value={totals.shippingTotal} />}</dd>
            </div>
            <div className="flex justify-between text-xs text-muted"><dt>شامل ضريبة القيمة المضافة</dt><dd><Price value={totals.taxTotal} /></dd></div>
          </dl>

          <div className="mt-4 flex justify-between border-t pt-4 text-base font-bold">
            <span>الإجمالي التقديري</span>
            <Price value={totals.grandTotal} size="lg" />
          </div>

          <Button href="/checkout" size="lg" className="mt-5 w-full">إتمام الشراء</Button>
        </aside>
      </div>
    </div>
  );
}
