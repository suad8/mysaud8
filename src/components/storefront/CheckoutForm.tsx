"use client";

import { startTransition, useActionState, useMemo, useState } from "react";
import { Price } from "@/components/ui/Price";
import { Button } from "@/components/ui/Button";
import { createOrderAction, type CheckoutFormState } from "@/server/orders/actions";
import { saveCheckoutPhoneAction } from "@/server/cart/actions";
import { normalizePhone } from "@/lib/phone";
import { calculateTotals, type DiscountInput } from "@/server/cart/pricing";
import { matchZoneForCity, type ShippingZoneWithRates } from "@/server/shipping/match";
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

const STEPS = [
  { n: 1, label: "رقم الجوال" },
  { n: 2, label: "بيانات التوصيل والدفع" },
];

export function CheckoutForm({
  lines,
  zones,
  discount,
  couponCode,
  bankSettings,
}: {
  lines: Line[];
  zones: ShippingZoneWithRates[];
  discount: DiscountInput | null;
  couponCode: string | null;
  bankSettings: BankTransferSettings;
}) {
  const [state, formAction, isPending] = useActionState(createOrderAction, initialState);

  /** إرسال يدوي: الإرسال التلقائي في React 19 يفرّغ النموذج (ومنه ملف الإيصال) حتى عند فشل التحقق. */
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
    startTransition(() => formAction(formData));
  }
  const [payment, setPayment] = useState<PaymentKey>("BANK_TRANSFER");
  const [copied, setCopied] = useState<string | null>(null);
  const [receiptName, setReceiptName] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [phone, setPhone] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [city, setCity] = useState("");
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null);

  const matchedZone = useMemo(() => matchZoneForCity(zones, city), [zones, city]);
  const activeRateId = selectedRateId && matchedZone?.rates.some((r) => r.id === selectedRateId) ? selectedRateId : (matchedZone?.rates[0]?.id ?? null);
  const selectedRate = matchedZone?.rates.find((r) => r.id === activeRateId) ?? null;

  const totals = calculateTotals({
    lines,
    discount,
    shippingRate: selectedRate?.price ?? 0,
    freeShippingAbove: selectedRate?.freeAbove ?? null,
  });

  function copy(value: string, key: string) {
    if (!value) return;
    navigator.clipboard?.writeText(value).then(() => {
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    });
  }

  const phoneInvalid = phone.trim() !== "" && !normalizePhone(phone);

  function goToDetails() {
    if (!phone.trim() || phoneInvalid) {
      setPhoneTouched(true);
      return;
    }
    // حفظ الجوال على السلة (للتذكير إن لم يكتمل الطلب) — لا يؤخّر الانتقال للخطوة التالية
    saveCheckoutPhoneAction(phone).catch(() => {});
    setStep(2);
  }

  const err = (field: string) => state.fieldErrors?.[field];

  return (
    <div className="mt-8">
      {/* مؤشر الخطوات */}
      <ol className="flex items-center gap-2 text-sm">
        {STEPS.map((s, i) => (
          <li key={s.n} className="flex flex-1 items-center gap-2">
            <span
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold num ${
                step >= s.n ? "bg-brand-700 text-white" : "bg-ink-100 text-muted dark:bg-ink-800"
              }`}
            >
              {s.n}
            </span>
            <span className={step >= s.n ? "font-semibold" : "text-muted"}>{s.label}</span>
            {i < STEPS.length - 1 && <span className="mx-2 hidden h-px flex-1 bg-[var(--border-subtle)] sm:block" />}
          </li>
        ))}
      </ol>

      {/* الخطوة ١: رقم الجوال فقط — أقل احتكاك ممكن للبدء، بلا حساب أو تسجيل دخول */}
      {step === 1 && (
        <div className="mx-auto mt-8 max-w-sm">
          <div className="surface-card p-6 text-center">
            <h2 className="text-base font-semibold">أدخل رقم جوالك للمتابعة</h2>
            <p className="mt-1 text-xs text-muted">تسوّق كزائر — بلا حاجة لإنشاء حساب</p>
            <div className="mt-5 text-start">
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-muted">رقم الجوال</span>
                <input
                  type="tel"
                  inputMode="tel"
                  placeholder="05xxxxxxxx"
                  autoFocus
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={`h-12 w-full rounded-xl border bg-transparent px-3.5 outline-none transition-shadow focus:ring-2 ${
                    phoneTouched && (!phone.trim() || phoneInvalid) ? "border-red-400 focus:ring-red-400/40" : "focus:ring-brand-500/40"
                  }`}
                />
                {phoneTouched && !phone.trim() && <span className="mt-1 block text-xs text-red-600">رقم الجوال مطلوب</span>}
                {phoneTouched && phoneInvalid && <span className="mt-1 block text-xs text-red-600">رقم الجوال غير صحيح — اكتبه مثل 05xxxxxxxx</span>}
              </label>
            </div>
            <Button type="button" size="lg" className="mt-5 w-full" onClick={goToDetails}>
              متابعة للدفع
            </Button>
            <div className="mt-4 flex items-center justify-between border-t pt-4 text-sm">
              <span className="text-muted">المجموع الفرعي</span>
              <Price value={totals.subtotal} />
            </div>
          </div>
        </div>
      )}

      {/* الخطوة ٢: باقي بيانات التوصيل وطريقة الدفع، ثم إتمام الطلب فعلياً */}
      {step === 2 && (
        <form action={formAction} onSubmit={handleSubmit} className="mt-8 grid gap-8 lg:grid-cols-3">
      <input type="hidden" name="shippingRateId" value={activeRateId ?? ""} />
      <div className="space-y-6 lg:col-span-2">
        <button type="button" onClick={() => setStep(1)} className="text-sm font-medium text-brand-700 hover:underline">
          → تعديل رقم الجوال
        </button>

        {state.error && (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200 dark:bg-red-950 dark:text-red-300">
            {state.error}
          </div>
        )}

        {/* التواصل والتوصيل */}
        <section className="surface-card p-5">
          <h2 className="text-sm font-semibold">معلومات التواصل والتوصيل</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field name="name" label="الاسم الكامل" placeholder="مثال: سارة العتيبي" defaultValue={state.values?.name} error={err("name")} autoFocus />
            <Field name="phone" label="رقم الجوال" placeholder="05xxxxxxxx" type="tel" defaultValue={state.values?.phone ?? phone} error={err("phone")} />
            <Field name="email" label="البريد الإلكتروني (اختياري)" placeholder="example@mail.com" type="email" defaultValue={state.values?.email} className="sm:col-span-2" />
            <Field
              name="city"
              label="المدينة"
              placeholder="الرياض"
              defaultValue={state.values?.city}
              error={err("city")}
              onChange={(e) => {
                setCity(e.target.value);
                setSelectedRateId(null);
              }}
            />
            <Field name="district" label="الحي (اختياري)" placeholder="حي النخيل" defaultValue={state.values?.district} />
            <Field name="street" label="العنوان التفصيلي" placeholder="اسم الشارع، رقم المبنى" className="sm:col-span-2" defaultValue={state.values?.street} error={err("street")} />
            <Field
              name="taxNumber"
              label="الرقم الضريبي (اختياري — لإصدار فاتورة ضريبية)"
              placeholder="15 رقماً"
              inputMode="numeric"
              className="num sm:col-span-2"
              defaultValue={state.values?.taxNumber}
              error={err("taxNumber")}
            />
            <Field name="notes" label="ملاحظات إضافية (اختياري)" placeholder="تفاصيل توصيل إضافية" className="sm:col-span-2" defaultValue={state.values?.notes} />
          </div>
        </section>

        {/* طريقة الشحن */}
        <section className="surface-card p-5">
          <h2 className="text-sm font-semibold">طريقة الشحن</h2>
          {matchedZone && matchedZone.rates.length > 0 ? (
            <div className="mt-4 space-y-2.5">
              {matchedZone.rates.map((rate) => {
                const rateTotals = calculateTotals({ lines, discount, shippingRate: rate.price, freeShippingAbove: rate.freeAbove });
                return (
                  <label
                    key={rate.id}
                    className={`flex cursor-pointer items-center justify-between rounded-xl border p-4 ${activeRateId === rate.id ? "border-brand-600 bg-brand-50 dark:bg-brand-950" : ""}`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        checked={activeRateId === rate.id}
                        onChange={() => setSelectedRateId(rate.id)}
                        className="h-4 w-4 accent-brand-600"
                      />
                      <div>
                        <p className="text-sm font-medium">{rate.nameAr}</p>
                        {(rate.minDays || rate.maxDays) && (
                          <p className="text-xs text-muted">خلال {rate.minDays ?? "?"}–{rate.maxDays ?? "?"} أيام عمل</p>
                        )}
                      </div>
                    </div>
                    <span className="num text-sm font-semibold">
                      {rateTotals.shippingTotal === 0 ? "مجاني" : <Price value={rateTotals.shippingTotal} size="sm" />}
                    </span>
                  </label>
                );
              })}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">أدخل مدينتك أعلاه لعرض خيارات الشحن المتاحة.</p>
          )}
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
          {totals.discountTotal > 0 && (
            <div className="flex justify-between text-brand-700">
              <dt>الخصم{couponCode ? ` (${couponCode})` : ""}</dt>
              <dd>−<Price value={totals.discountTotal} /></dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-muted">الشحن</dt>
            <dd>{!selectedRate ? "—" : totals.shippingTotal === 0 ? <span className="text-brand-700">مجاني</span> : <Price value={totals.shippingTotal} />}</dd>
          </div>
          <div className="flex justify-between text-xs text-muted"><dt>شامل ضريبة القيمة المضافة</dt><dd><Price value={totals.taxTotal} /></dd></div>
        </dl>
        <div className="mt-4 flex justify-between border-t pt-4 text-base font-bold">
          <span>الإجمالي</span>
          <Price value={totals.grandTotal} size="lg" />
        </div>
        <Button type="submit" size="lg" className="mt-5 w-full" disabled={isPending || !activeRateId}>
          {isPending ? "جارٍ إرسال الطلب…" : "تأكيد الطلب"}
        </Button>
        <p className="mt-3 text-center text-[11px] text-muted">بالمتابعة أنت توافق على الشروط والأحكام</p>
      </aside>
        </form>
      )}
    </div>
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
