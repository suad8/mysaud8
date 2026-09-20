import { redirect } from "next/navigation";
import { calculateTotals } from "@/server/cart/pricing";
import { getCheckoutLines } from "@/server/orders/create";
import { getBankTransferSettings } from "@/server/settings";
import { CheckoutForm } from "@/components/storefront/CheckoutForm";

export default async function CheckoutPage() {
  const [lines, bankSettings] = await Promise.all([getCheckoutLines(), getBankTransferSettings()]);
  if (lines.length === 0) redirect("/cart");

  const standardTotals = calculateTotals({ lines, shippingRate: 20, freeShippingAbove: 200 });
  const expressTotals = calculateTotals({ lines, shippingRate: 40, freeShippingAbove: null });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">إتمام الطلب</h1>

      <CheckoutForm lines={lines} standardTotals={standardTotals} expressTotals={expressTotals} bankSettings={bankSettings} />
    </div>
  );
}
