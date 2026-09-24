import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Price } from "@/components/ui/Price";
import { db } from "@/server/db";
import { PAYMENT_METHOD_LABEL } from "@/lib/constants";
import { verifyOrderAccessToken } from "@/server/orders/access";

export const metadata = { robots: { index: false, follow: false } };

type Props = { params: Promise<{ number: string }>; searchParams: Promise<{ t?: string | string[] }> };

export default async function OrderConfirmationPage({ params, searchParams }: Props) {
  const [{ number }, { t }] = await Promise.all([params, searchParams]);
  // بلا الرمز السري الصحيح تُعامَل الصفحة كغير موجودة — لا يُكشف حتى وجود الطلب
  if (!verifyOrderAccessToken(number, t)) notFound();
  const order = await db.order.findUnique({
    where: { number },
    include: { items: true, payments: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!order) notFound();

  const payment = order.payments[0];
  const isBankTransfer = payment?.method === "BANK_TRANSFER";
  const isPendingReview = isBankTransfer && payment.status === "INITIATED";

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand-100 dark:bg-brand-950">
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 stroke-brand-700 dark:stroke-brand-400">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </div>

      <h1 className="mt-6 text-2xl font-extrabold tracking-tight">تم استلام طلبك</h1>
      <p className="mt-2 text-sm text-muted">
        رقم الطلب <span className="num font-bold text-[var(--text-strong)]">{order.number}</span>
      </p>

      {isPendingReview ? (
        <div className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          طلبك بانتظار مراجعة إيصال التحويل البنكي — سنؤكد الدفع خلال 24 ساعة ونُعلمك عبر جوالك.
        </div>
      ) : payment?.method === "COD" ? (
        <div className="mt-6 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800 dark:bg-brand-950 dark:text-brand-300">
          سيتم تجهيز طلبك وتوصيله قريباً — الدفع نقداً عند الاستلام.
        </div>
      ) : null}

      <div className="surface-card mt-8 p-5 text-start">
        <h2 className="text-sm font-semibold">ملخص الطلب</h2>
        <ul className="mt-4 space-y-2 text-sm">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-2">
              <span className="text-muted">{item.nameAr} <span className="num">×{item.quantity}</span></span>
              <Price value={item.lineTotal.toString()} size="sm" />
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-between border-t pt-4 text-base font-bold">
          <span>الإجمالي</span>
          <Price value={order.grandTotal.toString()} size="lg" />
        </div>
        {payment && (
          <p className="mt-3 text-xs text-muted">
            طريقة الدفع: {PAYMENT_METHOD_LABEL[payment.method] ?? payment.method}
          </p>
        )}
      </div>

      <Button href="/" variant="secondary" size="lg" className="mt-8">
        العودة للمتجر
      </Button>
      <p className="mt-4 text-xs text-muted">
        تحتاج مساعدة؟ <Link href="/" className="text-brand-700 hover:underline">تواصل معنا</Link>
      </p>
    </div>
  );
}
