"use client";

import { startTransition, useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Price } from "@/components/ui/Price";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { addToCartAction } from "@/server/cart/actions";
import type { CustomFieldDef } from "@/server/products/custom-fields";
import type { OptionGroup } from "@/lib/product-options";

export type PurchaseVariant = {
  id: string;
  nameAr: string;
  price: number;
  comparePrice: number | null;
  available: number;
  options?: Record<string, string>;
};

export function ProductPurchasePanel({
  variants,
  customFields,
  optionGroups = [],
}: {
  variants: PurchaseVariant[];
  customFields: CustomFieldDef[];
  optionGroups?: OptionGroup[];
}) {
  const [state, formAction, isPending] = useActionState(addToCartAction, {});
  // البداية بأول خيار متوفر بدل أول خيار مطلقاً
  const [selectedId, setSelectedId] = useState((variants.find((v) => v.available > 0) ?? variants[0])?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [textValues, setTextValues] = useState<Record<string, string>>({});
  const [fileNames, setFileNames] = useState<Record<string, string | null>>({});
  const formRef = useRef<HTMLFormElement>(null);

  // بعد إضافة ناجحة فقط: تفريغ الحقول المخصّصة لطلب جديد (عند الخطأ تبقى الملفات والنصوص كما هي)
  useEffect(() => {
    if (!state.success) return;
    formRef.current?.reset();
    setTextValues({});
    setFileNames({});
  }, [state]);

  /** إرسال يدوي: الإرسال التلقائي في React 19 يفرّغ حقل الملف حتى عند فشل الإضافة. */
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
    startTransition(() => formAction(formData));
  }

  const missingRequired = customFields.some((f) => {
    if (!f.required) return false;
    if (f.type === "FILE") return !fileNames[f.id];
    return !textValues[f.id]?.trim();
  });

  const selected = useMemo(() => variants.find((v) => v.id === selectedId) ?? variants[0], [variants, selectedId]);
  const hasVariants = variants.length > 1;
  // مجموعات الخيارات (مثل سلة): تُستخدم فقط إن كان لكل متغيّر قيمة في كل مجموعة
  const groups = useMemo(
    () => optionGroups.filter((g) => g.values.length > 0 && variants.every((v) => v.options?.[g.name] !== undefined)),
    [optionGroups, variants],
  );
  const grouped = groups.length > 0 && hasVariants;

  /** اختيار قيمة في مجموعة: التركيبة المطابقة إن وُجدت ومتوفرة، وإلا أقرب تركيبة متوفرة بهذه القيمة. */
  function selectValue(group: string, value: string) {
    const wanted = { ...(selected?.options ?? {}), [group]: value };
    const exact = variants.find((v) => groups.every((g) => v.options?.[g.name] === wanted[g.name]));
    const withValue = variants.filter((v) => v.options?.[group] === value);
    const fallback = withValue.find((v) => v.available > 0) ?? withValue[0];
    const target = exact && (exact.available > 0 || !fallback || fallback.available <= 0) ? exact : fallback;
    if (target) selectVariant(target.id);
  }

  function valueState(group: string, value: string) {
    const withValue = variants.filter((v) => v.options?.[group] === value);
    const compatible = withValue.filter((v) => groups.every((g) => g.name === group || v.options?.[g.name] === selected?.options?.[g.name]));
    return {
      disabled: withValue.every((v) => v.available <= 0),
      soldOutHere: compatible.length > 0 && compatible.every((v) => v.available <= 0),
    };
  }
  const outOfStock = !selected || selected.available <= 0;

  function selectVariant(id: string) {
    setSelectedId(id);
    setQuantity(1);
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        {selected && selected.available > 0 ? (
          <Badge tone="green">متوفر</Badge>
        ) : (
          <Badge tone="gray">نفد المخزون</Badge>
        )}
      </div>

      <div className="mt-5">
        <Price value={selected?.price ?? 0} compareAt={selected?.comparePrice} size="lg" />
        <p className="mt-1 text-xs text-muted">شامل ضريبة القيمة المضافة</p>
      </div>

      {grouped &&
        groups.map((g) => (
          <div key={g.name} className="mt-6">
            <h2 className="text-sm font-semibold">
              {g.name}: <span className="font-normal text-muted">{selected?.options?.[g.name]}</span>
            </h2>
            <div className="mt-2.5 flex flex-wrap gap-2" role="radiogroup" aria-label={g.name}>
              {g.values.map((value) => {
                const active = selected?.options?.[g.name] === value;
                const { disabled, soldOutHere } = valueState(g.name, value);
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    disabled={disabled}
                    onClick={() => selectValue(g.name, value)}
                    className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      active
                        ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300"
                        : "hover:bg-ink-100 dark:hover:bg-ink-800"
                    } ${soldOutHere && !active ? "line-through decoration-ink-400" : ""}`}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

      {hasVariants && !grouped && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold">الخيار</h2>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {variants.map((v) => (
              <button
                key={v.id}
                type="button"
                disabled={v.available <= 0}
                onClick={() => selectVariant(v.id)}
                className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  v.id === selectedId
                    ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300"
                    : "hover:bg-ink-100 dark:hover:bg-ink-800"
                }`}
              >
                {v.nameAr}
              </button>
            ))}
          </div>
        </div>
      )}

      <form ref={formRef} action={formAction} onSubmit={handleSubmit} className="mt-7">
        <input type="hidden" name="variantId" value={selectedId} />
        <input type="hidden" name="quantity" value={quantity} />

        {customFields.length > 0 && (
          <div className="mb-5 space-y-4">
            {customFields.map((f) => (
              <label key={f.id} className="block text-sm">
                <span className="mb-1.5 block font-medium text-muted">
                  {f.label}
                  {f.required && <span className="text-red-600"> *</span>}
                </span>
                {f.type === "TEXTAREA" ? (
                  <textarea
                    name={`customField_${f.id}`}
                    rows={3}
                    maxLength={1000}
                    onChange={(e) => setTextValues((v) => ({ ...v, [f.id]: e.target.value }))}
                    className="w-full rounded-xl border bg-transparent px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500/40"
                  />
                ) : f.type === "FILE" ? (
                  <label className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed text-xs text-muted hover:border-brand-400 hover:text-brand-600">
                    <input
                      type="file"
                      name={`customField_${f.id}`}
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      className="hidden"
                      onChange={(e) => setFileNames((v) => ({ ...v, [f.id]: e.target.files?.[0]?.name ?? null }))}
                    />
                    <span>{fileNames[f.id] ?? "اختر ملفاً أو صورة"}</span>
                  </label>
                ) : (
                  <input
                    name={`customField_${f.id}`}
                    maxLength={1000}
                    onChange={(e) => setTextValues((v) => ({ ...v, [f.id]: e.target.value }))}
                    className="h-11 w-full rounded-xl border bg-transparent px-3.5 text-sm outline-none focus:ring-2 focus:ring-brand-500/40"
                  />
                )}
              </label>
            ))}
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="flex h-12 items-center rounded-xl border">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={outOfStock}
              className="w-11 text-lg text-muted disabled:opacity-40"
              aria-label="إنقاص الكمية"
            >
              −
            </button>
            <span className="num w-8 text-center text-sm font-medium">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(selected?.available ?? 1, q + 1))}
              disabled={outOfStock}
              className="w-11 text-lg text-muted disabled:opacity-40"
              aria-label="زيادة الكمية"
            >
              +
            </button>
          </div>
          <Button type="submit" size="lg" className="flex-1" disabled={outOfStock || isPending || missingRequired}>
            {outOfStock ? "نفد المخزون" : isPending ? "جارٍ الإضافة…" : "أضف إلى السلة"}
          </Button>
        </div>

        {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
        {state.success && <p className="mt-2 text-sm font-medium text-emerald-600">تمت الإضافة إلى السلة ✓</p>}
      </form>
    </div>
  );
}
