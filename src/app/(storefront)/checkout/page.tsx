import { redirect } from "next/navigation";
import { getCheckoutLines } from "@/server/orders/create";
import { getBankTransferSettings } from "@/server/settings";
import { getCartCouponCode } from "@/server/cart/queries";
import { validateCoupon, couponToDiscountInput } from "@/server/discounts/validate";
import { getActiveShippingZones } from "@/server/shipping/queries";
import { CheckoutForm } from "@/components/storefront/CheckoutForm";

export default async function CheckoutPage() {
  const [lines, bankSettings, couponCode, zones] = await Promise.all([
    getCheckoutLines(),
    getBankTransferSettings(),
    getCartCouponCode(),
    getActiveShippingZones(),
  ]);
  if (lines.length === 0) redirect("/cart");

  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const couponResult = couponCode ? await validateCoupon(couponCode, subtotal) : null;
  const validCoupon = couponResult && "coupon" in couponResult ? couponResult.coupon : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">إتمام الطلب</h1>

      <CheckoutForm
        lines={lines}
        zones={zones}
        couponCode={validCoupon?.code ?? null}
        discount={validCoupon ? couponToDiscountInput(validCoupon) : null}
        bankSettings={bankSettings}
      />
    </div>
  );
}
