"use client";

import { useActionState, useState } from "react";
import { Price } from "@/components/ui/Price";
import { Button } from "@/components/ui/Button";
import { createOrderAction, type CheckoutFormState } from "@/server/orders/actions";
import type { Totals } from "@/server/cart/pricing";
import type { BankTransferSettings } from "@/server/settings";

type Line = { nameAr: string; unitPrice: number; quantity: number };

type PaymentKey = "BANK_TRANSFER" | "COD" | "MADA" | "APPLE_PAY" | "CREDIT_CARD" | "TABBY";

const COMING_SOON: { key: PaymentKey; label: string; desc: string }[] = [
  { key: "MADA", label: "مدى", desc: "الدفع المباشر من حسابك البنكي" },
  { key: "APPLE_PAY", label: "Apple Pay", desc: "دفع سريع من جهازك" },
  { key: "CREDIT_CARD", label: "بطاقة ائتمانية", desc: "فيزا وماستركارد" },
  { key: "TABBY", label: "تابي", desc: "قسّمها على 4 دفعات بدون فوائد" },
];

const initialState: CheckoutFormState = {};

export function CheckoutForm({
  lines,
  standardTotals,
  expressTotals,
  bankSettings,
}: {
  lines: Line[];
  standardTotals: Totals;
  expressTotals: Totals;
  bankSettings: BankTransferSettings;
}) {
  const [state, formAction, isPending] = useActionState(createOrderAction, initialState);
  const [shipping, setShipping] = useState<"standard" | "express">("standard");
  const [payment, setPayment] = useState<PaymentKey>("BANK_TRANSFER");
  const [copied, setCopied] = useState<string | null>(null);
  const [receiptName, setReceiptName] = useState<string | null>(null);

  const totals = shipping === "express" ? expressTotals : standardTotals;

  function copy(value: string, key: string) {
    if (!value) return;
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    });
  }

  const err = (field: string) => state.fieldErrors?.[field];

  return (
    <form action={formAction} className="mt-8 grid gap-8 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {state.error && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200 dark:bg-red-950 dark:text-red-300">
            {state.error}
          </div>
        )}

        {/* التواصل والتوصيل */}
        <section className="surface-card p-5">
          <h2 className="text-sm font-semibold">معلومات التواصل والتوصيل</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field name="name" label="الاسم الكامل" placeholder="مثال: سارة العتيبي" error={err("name")} />
            <Field name="phone" label="رقم الجوال" placeholder="05xxxxxxxx" type="tel" error={err("phone")} />
            <Field name="email" label="البريد الإلكتروني (اختياري)" placeholder="example@mail.com" type="email" className="sm:col-span-2" />
            <Field name="city" label="المدينة" placeholder="الرياض" error={err("city")} />
            <Field name="district" label="الحي (اختياري)" placeholder="حي النخيل" />
            <Field name="street" label="العنوان التفصيلي" placeholder="اسم الشارع، رقم المبنى" className="sm:col-span-2" error={err("street")} />
            <Field name="notes" label="ملاحظات إضافية (اختياري)" placeholder="تفاصيل توصيل إضافية" className="sm:col-span-2" />
          </div>
        </section>

        {/* طريقة الشحن */}
        <section className="surface-card p-5">
          <h2 className="text-sm font-semibold">طريقة الشحن</h2>
          <div className="mt-4 space-y-2.5">
            {[
              { value: "standard" as const, label: "توصيل عادي", desc: "خلال 2–4 أيام عمل", price: standardTotals.shippingTotal === 0 ? "مجاني" : null, amount: standardTotals.shippingTotal },
              { value: "express" as const, label: "توصيل سريع", desc: "خلال يوم عمل واحد", price: null, amount: expressTotals.shippingTotal },
            ].map((opt) => (
              <label
                key={opt.value}
                className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 ${shipping === opt.value ? "border-brand-600 bg-brand-50 dark:bg-brand-950" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="shippingMethod"
                    value={opt.value}
                    checked={shipping === opt.value}
                    onChange={() => setShipping(opt.value)}
                    className="h-4 w-4 accent-brand-600"
                  />
                  <div>
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-muted">{opt.desc}</p>
                  </div>
                </div>
                <span className="num text-sm font-semibold">{opt.price ?? <Price value={opt.amount} size="sm" />}</span>
              </label>
            ))}
          </div>
        </section>

        {/* طريقة الدفع */}
        <section className="surface-card p-5">
          <h2 className="text-sm font-semibold">طريقة الدفع</h2>
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${payment === "BANK_TRANSFER" ? "border-brand-600 bg-brand-50 dark:bg-brand-950" : ""}`}>
              <input type="radio" name="paymentMethod" value="BANK_TRANSFER" checked={payment === "BANK_TRANSFER"} onChange={() => setPayment("BANK_TRANSFER")} className="mt-0.5 h-4 w-4 accent-brand-600" />
              <div>
                <p className="text-sm font-medium">تحويل بنكي</p>
                <p className="text-xs text-muted">حوّل المبلغ ثم أرفق صورة الإيصال</p>
              </div>
            </label>
            <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 ${payment === "COD" ? "border-brand-600 bg-brand-50 dark:bg-brand-950" : ""}`}>
              <input type="radio" name="paymentMethod" value="COD" checked={payment === "COD"} onChange={() => setPayment("COD")} className="mt-0.5 h-4 w-4 accent-brand-600" />
              <div>
                <p className="text-sm font-medium">الدفع عند الاستلام</p>
                <p className="text-xs text-muted">ادفع نقداً عند وصول الطلب</p>
              </div>
            </label>
            {COMING_SOON.map((m) => (
              <label key={m.key} className="flex cursor-not-allowed items-start gap-3 rounded-xl border p-4 opacity-50">
                <input type="radio" disabled className="mt-0.5 h-4 w-4" />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{m.label}</p>
                    <span className="shrink-0 rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-semibold text-muted dark:bg-ink-800">قريباً</span>
                  </div>
                  <p className="text-xs text-muted">{m.desc}</p>
                </div>
              </label>
            ))}
          </div>

          {/* لوحة التحويل البنكي */}
          {payment === "BANK_TRANSFER" && (
            <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-800 dark:bg-brand-950">
              <p className="text-sm font-semibold">حوّل المبلغ إلى الحساب التالي:</p>
              <dl className="mt-3 space-y-2 text-sm">
                <BankRow label="البنك" value={bankSettings.bankName} onCopy={copy} copiedKey={copied} rowKey="bank" />
                <BankRow label="اسم الحساب" value={bankSettings.accountName} onCopy={copy} copiedKey={copied} rowKey="name" />
                <BankRow label="الآيبان" value={bankSettings.iban} onCopy={copy} copiedKey={copied} rowKey="iban" mono />
                <BankRow label="رقم الحساب" value={bankSettings.accountNumber} onCopy={copy} copiedKey={copied} rowKey="acct" mono />
              </dl>

              <label className="mt-4 flex items-start gap-2.5 text-sm">
                <input type="checkbox" name="confirmTransfer" className="mt-0.5 h-4 w-4 accent-brand-600" />
                <span>أؤكد أنني حوّلت المبلغ إلى الحساب أعلاه</span>
              </label>
              {err("confirmTransfer") && <p className="mt-1 text-xs text-red-600">{err("confirmTransfer")}</p>}

              <div className="mt-4">
                <label className="mb-1.5 block text-sm font-medium text-muted">إرفاق إيصال التحويل</label>
                <label className="flex h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-muted hover:border-brand-400 hover:text-brand-600">
                  <input
                    type="file"
                    name="receipt"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="hidden"
                    onChange={(e) => setReceiptName(e.target.files?.[0]?.name ?? null)}
                  />
                  <span className="text-xs font-medium">{receiptName ?? "اختر صورة أو ملف PDF (حتى 5 ميغابايت)"}</span>
                </label>
                {err("receipt") && <p className="mt-1 text-xs text-red-600">{err("receipt")}</p>}
              </div>
            </div>
          )}

          {payment === "COD" && (
            <div className="mt-4 rounded-xl border p-4 text-sm text-muted">
              يُرجى تجهيز المبلغ نقداً عند استلام الطلب من المندوب.
            </div>
          )}
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
        <Button type="submit" size="lg" className="mt-5 w-full" disabled={isPending}>
          {isPending ? "جارٍ إرسال الطلب…" : "تأكيد الطلب"}
        </Button>
        <p className="mt-3 text-center text-[11px] text-muted">بالمتابعة أنت توافق على الشروط والأحكام</p>
      </aside>
    </form>
  );
}

function Field({
  name,
  label,
  className,
  error,
  ...rest
}: { name: string; label: string; className?: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={`block text-sm ${className ?? ""}`}>
      <span className="mb-1.5 block font-medium text-muted">{label}</span>
      <input
        name={name}
        {...rest}
        className={`h-11 w-full rounded-xl border bg-transparent px-3.5 outline-none transition-shadow focus:ring-2 ${error ? "border-red-400 focus:ring-red-400/40" : "focus:ring-brand-500/40"}`}
      />
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}

function BankRow({
  label,
  value,
  mono,
  onCopy,
  copiedKey,
  rowKey,
}: {
  label: string;
  value: string;
  mono?: boolean;
  onCopy: (value: string, key: string) => void;
  copiedKey: string | null;
  rowKey: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-white/60 px-3 py-2 dark:bg-black/20">
      <div className="min-w-0">
        <dt className="text-xs text-muted">{label}</dt>
        <dd className={`truncate font-medium ${mono ? "num" : ""}`}>{value || "—"}</dd>
      </div>
      {value && (
        <button
          type="button"
          onClick={() => onCopy(value, rowKey)}
          className="shrink-0 rounded-lg border px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:bg-ink-100 dark:hover:bg-ink-800"
        >
          {copiedKey === rowKey ? "تم النسخ ✓" : "نسخ"}
        </button>
      )}
    </div>
  );
}
