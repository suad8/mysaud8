"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import type { ProductFormState } from "@/server/products/actions";
import type { CustomFieldDef, CustomFieldType } from "@/server/products/custom-fields";
import { AiImageGenerator } from "@/components/admin/AiImageGenerator";
import { AiCopyGenerator } from "@/components/admin/AiCopyGenerator";
import type { AiProvider } from "@/server/ai/providers";
import { OptionsEditor } from "@/components/admin/OptionsEditor";
import type { OptionGroup, OptionSelection } from "@/lib/product-options";
import { PROMO_COLORS, PROMO_TITLE_MAX, promoClass } from "@/lib/promo";

type Category = { id: string; nameAr: string };

type VariantRow = {
  id: string;
  nameAr: string;
  sku: string;
  price: string;
  stock: number;
  options: OptionSelection;
};

type ExistingImage = { id: string; url: string; alt: string | null };

export type ProductFormInitial = {
  nameAr: string;
  shortDescAr: string;
  descAr: string;
  categoryId: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  isFeatured: boolean;
  promoTitle: string;
  promoColor: string;
  basePrice: string;
  comparePrice: string;
  costPrice: string;
  images: ExistingImage[];
  variants: VariantRow[];
  optionGroups: OptionGroup[];
  customFields: CustomFieldDef[];
};

const EMPTY: ProductFormInitial = {
  nameAr: "",
  shortDescAr: "",
  descAr: "",
  categoryId: "",
  status: "DRAFT",
  isFeatured: false,
  promoTitle: "",
  promoColor: "brand",
  basePrice: "",
  comparePrice: "",
  costPrice: "",
  images: [],
  variants: [],
  optionGroups: [],
  customFields: [],
};

type Action = (state: ProductFormState, formData: FormData) => Promise<ProductFormState>;

type EditableCustomField = { key: string; id: string; label: string; type: CustomFieldType; required: boolean };

let fieldCounter = 0;
function newFieldId() {
  fieldCounter += 1;
  return `cf-${Date.now()}-${fieldCounter}`;
}

export function ProductForm({
  mode,
  action,
  categories,
  initial,
  aiProviders = [],
}: {
  mode: "create" | "edit";
  action: Action;
  categories: Category[];
  initial?: ProductFormInitial;
  /** مزوّدو الذكاء الاصطناعي المفعّلون (مفاتيحهم في Railway) — فارغ = الميزة معطّلة */
  aiProviders?: AiProvider[];
}) {
  const data = initial ?? EMPTY;
  const [state, formAction, isPending] = useActionState(action, {});
  const [imageName, setImageName] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([]);
  const [promoTitle, setPromoTitle] = useState(data.promoTitle);
  const [promoColor, setPromoColor] = useState(data.promoColor || "brand");
  const topRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const hasErrors = Boolean(clientError || state.error || (state.fieldErrors && Object.keys(state.fieldErrors).length > 0));
  // عند فشل الحفظ: انتقل لأعلى النموذج حيث رسالة الخطأ — كانت تظهر خارج الشاشة فيبدو كأن الحفظ لم يحدث
  useEffect(() => {
    if (hasErrors) topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [state, clientError, hasErrors]);

  const [multiOption, setMultiOption] = useState(data.variants.length > 1 || data.optionGroups.length > 0);


  const [customFields, setCustomFields] = useState<EditableCustomField[]>(() =>
    data.customFields.map((f) => ({ key: f.id, id: f.id, label: f.label, type: f.type, required: f.required })),
  );

  function addCustomField() {
    setCustomFields((f) => [...f, { key: newFieldId(), id: newFieldId(), label: "", type: "TEXT", required: false }]);
  }

  function removeCustomField(key: string) {
    setCustomFields((f) => f.filter((x) => x.key !== key));
  }

  function updateCustomField(key: string, patch: Partial<Pick<EditableCustomField, "label" | "type" | "required">>) {
    setCustomFields((f) => f.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  }

  const err = (field: string) => state.fieldErrors?.[field];

  /**
   * إرسال يدوي داخل transition بدل الإرسال التلقائي: React 19 يفرّغ حقول النموذج
   * بعد كل إرسال تلقائي حتى عند فشل الحفظ، فيضيع ما كتبه المستخدم.
   */
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (customFields.some((f) => !f.label.trim())) {
      setClientError("اكتب عنواناً لكل حقل مخصّص (مثال: أرفق تصميمك) أو احذف الحقل الفارغ.");
      return;
    }
    setClientError(null);
    const formData = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
    startTransition(() => formAction(formData));
  }

  const errorMessage = clientError ?? state.error ?? (state.fieldErrors && Object.keys(state.fieldErrors).length > 0 ? "لم يتم الحفظ — راجع الحقول المظلّلة بالأحمر." : null);

  return (
    <form ref={formRef} action={formAction} onSubmit={handleSubmit}>
      <div ref={topRef} className="scroll-mt-24" />
      {errorMessage && (
        <div role="alert" className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200 dark:bg-red-950 dark:text-red-300">
          {errorMessage}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold">المعلومات الأساسية</h2>
            <div className="mt-4 space-y-4">
              <Field name="nameAr" label="اسم المنتج" defaultValue={data.nameAr} error={err("nameAr")} />
              <Field name="shortDescAr" label="الوصف المختصر" defaultValue={data.shortDescAr} />
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-muted">الوصف الكامل</span>
                <textarea
                  name="descAr"
                  defaultValue={data.descAr}
                  rows={5}
                  className="w-full rounded-xl border bg-transparent px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-brand-500/40"
                />
              </label>
              <AiCopyGenerator
                providers={aiProviders}
                getContext={() => {
                  const form = formRef.current;
                  const category = form?.querySelector<HTMLSelectElement>('select[name="categoryId"]');
                  return {
                    name: form?.querySelector<HTMLInputElement>('input[name="nameAr"]')?.value ?? "",
                    category: category?.value ? (category.selectedOptions[0]?.text ?? "") : "",
                    optionGroups: form?.querySelector<HTMLInputElement>('input[name="optionGroups"]')?.value ?? "",
                  };
                }}
                fill={(field, value) => {
                  const el = formRef.current?.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${field}"]`);
                  if (el) el.value = value;
                }}
              />
            </div>
          </section>

          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold">الصور</h2>
            <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-5">
              {removedImageIds.map((id) => (
                <input key={id} type="hidden" name="removeImageId" value={id} />
              ))}
              {data.images.map((img) => {
                const removed = removedImageIds.includes(img.id);
                return (
                  <div key={img.id} className="relative aspect-square overflow-hidden rounded-xl bg-[var(--surface-sunken)]">
                    <Image src={img.url} alt={img.alt ?? ""} fill sizes="120px" className={`object-cover ${removed ? "opacity-25" : ""}`} />
                    <button
                      type="button"
                      onClick={() => setRemovedImageIds((ids) => (removed ? ids.filter((x) => x !== img.id) : [...ids, img.id]))}
                      className={`absolute end-1 top-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${removed ? "bg-white text-ink-900" : "bg-red-600 text-white"}`}
                      aria-label={removed ? "تراجع عن حذف الصورة" : "حذف الصورة"}
                    >
                      {removed ? "تراجع" : "حذف ✕"}
                    </button>
                    {removed && <span className="absolute inset-x-0 bottom-1 text-center text-[11px] font-semibold text-red-700">تُحذف عند الحفظ</span>}
                  </div>
                );
              })}
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-muted hover:border-brand-400 hover:text-brand-600">
                <input
                  type="file"
                  name="image"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => setImageName(e.target.files?.[0]?.name ?? null)}
                />
                <span className="text-2xl leading-none">+</span>
                <span className="px-1 text-center text-[11px] leading-tight">{imageName ?? "إضافة"}</span>
              </label>
            </div>
            {err("image") && <p className="mt-2 text-xs text-red-600">{err("image")}</p>}
            <p className="mt-2 text-[11px] text-muted">JPG أو PNG أو WEBP، حتى 5 ميغابايت.</p>
            <AiImageGenerator
              providers={aiProviders}
              getProductName={() => formRef.current?.querySelector<HTMLInputElement>('input[name="nameAr"]')?.value ?? ""}
            />
          </section>

          {/* خيارات المنتج: منتج بخيار واحد يُدار سعره ومخزونه من حقلي "التسعير"
              و"المخزون" بالعمود الجانبي مباشرة. عند تفعيل "عدة خيارات" يظهر
              جدول قابل للإضافة والحذف — مناسب لمنتجات بمقاسات/أنواع متعددة
              (مثلاً: مقاسات ورق وأنواع طباعة مختلفة). */}
          <OptionsEditor
            enabled={multiOption}
            onEnabledChange={setMultiOption}
            initialGroups={data.optionGroups}
            initialVariants={data.variants.map((v) => ({ id: v.id, nameAr: v.nameAr, options: v.options, price: v.price, stock: v.stock }))}
            getBasePrice={() => formRef.current?.querySelector<HTMLInputElement>('input[name="basePrice"]')?.value ?? ""}
          />

          {/* حقول مخصّصة يملؤها العميل عند الشراء — نص أو رفع ملف/صورة (مثل
              "أرفق تصميمك" لطلبات الطباعة المخصّصة). تختلف عن "الخيارات" أعلاه:
              لا تغيّر السعر أو المخزون، هي بيانات يزوّدها العميل نفسه لكل طلب. */}
          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold">حقول مخصّصة للعميل</h2>
            <p className="mt-1 text-xs text-muted">
              مثل "أرفق تصميمك" (ملف أو صورة) أو ملاحظة نصية — تظهر بصفحة المنتج ويملؤها العميل قبل الإضافة للسلة.
            </p>
            <div className="mt-4 space-y-3">
              {customFields.map((f) => (
                <div key={f.key} className="flex flex-wrap items-center gap-2.5 rounded-lg border p-3">
                  <input type="hidden" name="customFieldId" value={f.id} />
                  <input type="hidden" name="customFieldRequired" value={f.required ? "on" : ""} />
                  <input
                    name="customFieldLabel"
                    value={f.label}
                    onChange={(e) => updateCustomField(f.key, { label: e.target.value })}
                    placeholder="عنوان الحقل (مثال: أرفق تصميمك)"
                    className={`h-10 min-w-[160px] flex-1 rounded-lg border bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-brand-500/40 ${clientError && !f.label.trim() ? "border-red-400" : ""}`}
                  />
                  <select
                    name="customFieldType"
                    value={f.type}
                    onChange={(e) => updateCustomField(f.key, { type: e.target.value as CustomFieldType })}
                    className="h-10 rounded-lg border bg-transparent px-2 text-sm outline-none focus:ring-2 focus:ring-brand-500/40"
                  >
                    <option value="TEXT">نص قصير</option>
                    <option value="TEXTAREA">نص طويل</option>
                    <option value="FILE">ملف أو صورة</option>
                  </select>
                  <label className="flex items-center gap-1.5 text-xs whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={f.required}
                      onChange={(e) => updateCustomField(f.key, { required: e.target.checked })}
                      className="h-4 w-4 accent-brand-600"
                    />
                    مطلوب
                  </label>
                  <button
                    type="button"
                    onClick={() => removeCustomField(f.key)}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-muted hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                    aria-label="إزالة الحقل"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button type="button" onClick={addCustomField} className="text-xs font-medium text-brand-700 hover:underline">
                + إضافة حقل مخصّص
              </button>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold">الحالة</h2>
            <select
              name="status"
              defaultValue={data.status}
              className="mt-3 h-10 w-full rounded-lg border bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-brand-500/40"
            >
              <option value="DRAFT">مسودة</option>
              <option value="ACTIVE">منشور</option>
              <option value="ARCHIVED">مؤرشف</option>
            </select>
            <label className="mt-3 flex items-center gap-2.5 text-sm">
              <input type="checkbox" name="isFeatured" defaultChecked={data.isFeatured} className="h-4 w-4 accent-brand-600" />
              ⭐ منتج بارز (يظهر في قسم المنتجات البارزة)
            </label>
          </section>

          {/* العنوان الترويجي: شارة على صورة المنتج (مثل سلة) — حتى 25 حرفاً */}
          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold">العنوان الترويجي</h2>
            <p className="mt-1 text-[11px] text-muted">يظهر على صورة المنتج لجذب الانتباه — مثل «شحن مجاني» أو «الأكثر طلباً».</p>
            <input
              name="promoTitle"
              value={promoTitle}
              onChange={(e) => setPromoTitle(e.target.value.slice(0, PROMO_TITLE_MAX))}
              maxLength={PROMO_TITLE_MAX}
              placeholder="مثال: خصم 20%"
              className="mt-3 h-10 w-full rounded-lg border bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-brand-500/40"
            />
            <p className="mt-1 text-end text-[11px] text-muted num">{promoTitle.length}/{PROMO_TITLE_MAX}</p>
            <input type="hidden" name="promoColor" value={promoColor} />
            <div className="mt-2 flex flex-wrap gap-2">
              {(Object.keys(PROMO_COLORS) as (keyof typeof PROMO_COLORS)[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setPromoColor(c)}
                  aria-pressed={promoColor === c}
                  className={`rounded-full px-3 py-1 text-[11px] font-bold ${PROMO_COLORS[c].className} ${promoColor === c ? "ring-2 ring-offset-2 ring-brand-500" : "opacity-70"}`}
                >
                  {PROMO_COLORS[c].label}
                </button>
              ))}
            </div>
            {promoTitle && (
              <p className="mt-3 text-[11px] text-muted">
                المعاينة: <span className={`ms-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${promoClass(promoColor)}`}>{promoTitle}</span>
              </p>
            )}
          </section>

          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold">التصنيف</h2>
            <select
              name="categoryId"
              defaultValue={data.categoryId}
              className="mt-3 h-10 w-full rounded-lg border bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-brand-500/40"
            >
              <option value="">بدون تصنيف</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.nameAr}</option>
              ))}
            </select>
          </section>

          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold">التسعير</h2>
            <div className="mt-4 space-y-3">
              <Field name="basePrice" label="السعر الأساسي" defaultValue={data.basePrice} inputMode="decimal" className="num" error={err("basePrice")} />
              <Field name="comparePrice" label="سعر ما قبل الخصم (اختياري)" defaultValue={data.comparePrice} inputMode="decimal" className="num" error={err("comparePrice")} />
              <Field name="costPrice" label="التكلفة (داخلي، اختياري)" defaultValue={data.costPrice} inputMode="decimal" className="num" error={err("costPrice")} />
              {!multiOption && mode === "create" && (
                <Field name="stock" label="الكمية الأولية في المخزون" defaultValue="0" inputMode="numeric" className="num" error={err("stock")} />
              )}
              {!multiOption && mode === "edit" && data.variants.length === 1 && (
                <Field name="stock" label="الكمية في المخزون" defaultValue={String(data.variants[0].stock)} inputMode="numeric" className="num" error={err("stock")} />
              )}
            </div>
          </section>

          <Button type="submit" size="lg" className="w-full" disabled={isPending}>
            {isPending ? "جارٍ الحفظ…" : mode === "create" ? "إنشاء المنتج" : "حفظ التغييرات"}
          </Button>
          {/* حالة الحفظ بجانب الزر مباشرة — لا يحتاج المستخدم للتمرير لأعلى ليعرف النتيجة */}
          {!isPending && errorMessage && <p role="status" className="text-center text-sm text-red-600">{errorMessage}</p>}
          {!isPending && !errorMessage && state.savedAt && (
            <p role="status" key={state.savedAt} className="text-center text-sm font-medium text-emerald-600">تم حفظ التغييرات ✓</p>
          )}
        </div>
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  error,
  className,
  ...rest
}: { name: string; label: string; error?: string; className?: string } & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "name" | "id"
>) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-muted">{label}</span>
      <input
        name={name}
        {...rest}
        className={`h-11 w-full rounded-xl border bg-transparent px-3.5 outline-none focus:ring-2 ${error ? "border-red-400 focus:ring-red-400/40" : "focus:ring-brand-500/40"} ${className ?? ""}`}
      />
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
