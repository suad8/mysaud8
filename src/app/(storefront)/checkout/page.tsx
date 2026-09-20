import { redirect } from "next/navigation";
import { calculateTotals } from "@/server/cart/pricing";
import { getCheckoutLines } from "@/server/orders/create";
import { getBankTransferSettings } from "@/server/settings";
import { CheckoutForm } from "@/components/storefront/CheckoutForm";

const STEPS = [
  { n: 1, label: "بيانات التوصيل والدفع" },
  { n: 2, label: "المراجعة" },
];

export default async function CheckoutPage() {
  const [lines, bankSettings] = await Promise.all([getCheckoutLines(), getBankTransferSettings()]);
  if (lines.length === 0) redirect("/cart");

  const standardTotals = calculateTotals({ lines, shippingRate: 20, freeShippingAbove: 200 });
  const expressTotals = calculateTotals({ lines, shippingRate: 40, freeShippingAbove: null });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">إتمام الطلب</h1>

      {/* مؤشر الخطوات */}
      <ol className="mt-6 flex items-center gap-2 text-sm">
        {STEPS.map((s, i) => (
          <li key={s.n} className="flex flex-1 items-center gap-2">
            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold num ${
              i === 0 ? "bg-brand-700 text-white" : "bg-ink-100 text-muted dark:bg-ink-800"
            }`}>
              {s.n}
            </span>
            <span className={i === 0 ? "font-semibold" : "text-muted"}>{s.label}</span>
            {i < STEPS.length - 1 && <span className="mx-2 hidden h-px flex-1 bg-[var(--border-subtle)] sm:block" />}
          </li>
        ))}
      </ol>

      <CheckoutForm lines={lines} standardTotals={standardTotals} expressTotals={expressTotals} bankSettings={bankSettings} />
    </div>
  );
}
