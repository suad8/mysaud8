import { Price } from "@/components/ui/Price";
import { Button } from "@/components/ui/Button";
import { db } from "@/server/db";
import { calculateTotals } from "@/server/cart/pricing";

async function getDemoCartLines() {
  const variants = await db.productVariant.findMany({
    take: 2,
    include: { product: true },
    orderBy: { createdAt: "asc" },
  });
  return variants.map((v, i) => ({ unitPrice: Number(v.price), quantity: i === 0 ? 2 : 1, nameAr: v.product.nameAr }));
}

const STEPS = [
  { n: 1, label: "بيانات التوصيل" },
  { n: 2, label: "طريقة الدفع" },
  { n: 3, label: "المراجعة" },
];

const PAYMENT_METHODS = [
  { key: "mada", label: "مدى", desc: "الدفع المباشر من حسابك البنكي" },
  { key: "apple", label: "Apple Pay", desc: "دفع سريع من جهازك" },
  { key: "card", label: "بطاقة ائتمانية", desc: "فيزا وماستركارد" },
  { key: "tabby", label: "تابي", desc: "قسّمها على 4 دفعات بدون فوائد" },
  { key: "cod", label: "الدفع عند الاستلام", desc: "رسوم إضافية 15 ر.س" },
];

export default async function CheckoutPage() {
  const lines = await getDemoCartLines();
  const totals = calculateTotals({ lines, shippingRate: 20, freeShippingAbove: 200 });

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

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* التواصل والتوصيل */}
          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold">معلومات التواصل والتوصيل</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="الاسم الكامل" placeholder="مثال: سارة العتيبي" />
              <Field label="رقم الجوال" placeholder="05xxxxxxxx" type="tel" />
              <Field label="البريد الإلكتروني" placeholder="example@mail.com" type="email" className="sm:col-span-2" />
              <Field label="المدينة" placeholder="الرياض" />
              <Field label="الحي" placeholder="حي النخيل" />
              <Field label="العنوان التفصيلي" placeholder="اسم الشارع، رقم المبنى" className="sm:col-span-2" />
              <Field label="ملاحظات إضافية (اختياري)" placeholder="تفاصيل توصيل إضافية" className="sm:col-span-2" />
            </div>
          </section>

          {/* طريقة الشحن */}
          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold">طريقة الشحن</h2>
            <div className="mt-4 space-y-2.5">
              {[
                { label: "توصيل عادي", desc: "خلال 2–4 أيام عمل", price: totals.shippingTotal === 0 ? "مجاني" : null },
                { label: "توصيل سريع", desc: "خلال يوم عمل واحد", price: "40 ر.س" },
              ].map((opt, i) => (
                <label key={opt.label} className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 ${i === 0 ? "border-brand-600 bg-brand-50 dark:bg-brand-950" : ""}`}>
                  <div className="flex items-center gap-3">
                    <input type="radio" name="shipping" defaultChecked={i === 0} className="h-4 w-4 accent-brand-600" />
                    <div>
                      <p className="text-sm font-medium">{opt.label}</p>
                      <p className="text-xs text-muted">{opt.desc}</p>
                    </div>
                  </div>
                  <span className="num text-sm font-semibold">{opt.price ?? <Price value={totals.shippingTotal} size="sm" />}</span>
                </label>
              ))}
            </div>
          </section>

          {/* طريقة الدفع */}
          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold">طريقة الدفع</h2>
            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {PAYMENT_METHODS.map((m, i) => (
                <label key={m.key} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${i === 0 ? "border-brand-600 bg-brand-50 dark:bg-brand-950" : ""}`}>
                  <input type="radio" name="payment" defaultChecked={i === 0} className="mt-0.5 h-4 w-4 accent-brand-600" />
                  <div>
                    <p className="text-sm font-medium">{m.label}</p>
                    <p className="text-xs text-muted">{m.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </section>
        </div>

        {/* الملخص */}
        <aside className="surface-card h-fit p-5">
          <h2 className="text-sm font-semibold">ملخص الطلب</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {lines.map((l, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span className="text-muted">{l.nameAr} <span className="num">×{l.quantity}</span></span>
                <Price value={l.unitPrice * l.quantity} size="sm" />
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2.5 border-t pt-4 text-sm">
            <div className="flex justify-between"><dt className="text-muted">المجموع الفرعي</dt><dd><Price value={totals.subtotal} /></dd></div>
            <div className="flex justify-between">
              <dt className="text-muted">الشحن</dt>
              <dd>{totals.shippingTotal === 0 ? <span className="text-brand-700">مجاني</span> : <Price value={totals.shippingTotal} />}</dd>
            </div>
            <div className="flex justify-between text-xs text-muted"><dt>شامل ضريبة القيمة المضافة</dt><dd><Price value={totals.taxTotal} /></dd></div>
          </dl>
          <div className="mt-4 flex justify-between border-t pt-4 text-base font-bold">
            <span>الإجمالي</span>
            <Price value={totals.grandTotal} size="lg" />
          </div>
          <Button size="lg" className="mt-5 w-full">تأكيد الطلب والدفع</Button>
          <p className="mt-3 text-center text-[11px] text-muted">بالمتابعة أنت توافق على الشروط والأحكام</p>
        </aside>
      </div>
    </div>
  );
}

function Field({
  label,
  className,
  ...rest
}: { label: string; className?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={`block text-sm ${className ?? ""}`}>
      <span className="mb-1.5 block font-medium text-muted">{label}</span>
      <input
        {...rest}
        className="h-11 w-full rounded-xl border bg-transparent px-3.5 outline-none transition-shadow focus:ring-2 focus:ring-brand-500/40"
      />
    </label>
  );
}
