"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import type { ProductFormState } from "@/server/products/actions";

type Category = { id: string; nameAr: string };

type VariantRow = {
  id: string;
  nameAr: string;
  sku: string;
  price: string;
  stock: number;
};

type ExistingImage = { id: string; url: string; alt: string | null };

export type ProductFormInitial = {
  nameAr: string;
  shortDescAr: string;
  descAr: string;
  categoryId: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  isFeatured: boolean;
  basePrice: string;
  comparePrice: string;
  costPrice: string;
  images: ExistingImage[];
  variants: VariantRow[];
};

const EMPTY: ProductFormInitial = {
  nameAr: "",
  shortDescAr: "",
  descAr: "",
  categoryId: "",
  status: "DRAFT",
  isFeatured: false,
  basePrice: "",
  comparePrice: "",
  costPrice: "",
  images: [],
  variants: [],
};

type Action = (state: ProductFormState, formData: FormData) => Promise<ProductFormState>;

export function ProductForm({
  mode,
  action,
  categories,
  initial,
}: {
  mode: "create" | "edit";
  action: Action;
  categories: Category[];
  initial?: ProductFormInitial;
}) {
  const data = initial ?? EMPTY;
  const [state, formAction, isPending] = useActionState(action, {});
  const [imageName, setImageName] = useState<string | null>(null);

  const err = (field: string) => state.fieldErrors?.[field];

  return (
    <form action={formAction}>
      {state.error && (
        <div className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200 dark:bg-red-950 dark:text-red-300">
          {state.error}
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
            </div>
          </section>

          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold">الصور</h2>
            <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-5">
              {data.images.map((img) => (
                <div key={img.id} className="relative aspect-square overflow-hidden rounded-xl bg-[var(--surface-sunken)]">
                  <Image src={img.url} alt={img.alt ?? ""} fill sizes="120px" className="object-cover" />
                </div>
              ))}
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
          </section>

          {/* جدول المتغيّرات يظهر فقط لمنتج بعدّة خيارات (مقاس/لون...). المنتج
              بمتغيّر واحد يُدار سعره ومخزونه من حقلي "التسعير" و"المخزون"
              بالعمود الجانبي مباشرة، تفادياً لحقل سعر مكرّر يسبب تعارضاً. */}
          {mode === "edit" && data.variants.length > 1 && (
            <section className="surface-card overflow-hidden">
              <div className="p-5 pb-0">
                <h2 className="text-sm font-semibold">المتغيّرات والمخزون</h2>
                <p className="mt-1 text-xs text-muted">تعديل السعر أو الكمية يُحفظ مع بقية النموذج عند الضغط على حفظ.</p>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-muted">
                      <th className="px-5 py-3 text-start font-medium">المتغيّر</th>
                      <th className="px-5 py-3 text-start font-medium">SKU</th>
                      <th className="px-5 py-3 text-start font-medium">السعر</th>
                      <th className="px-5 py-3 text-start font-medium">المخزون</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.variants.map((v) => (
                      <tr key={v.id} className="border-t">
                        <td className="px-5 py-3 font-medium">
                          {v.nameAr}
                          <input type="hidden" name="variantId" value={v.id} />
                        </td>
                        <td className="num px-5 py-3 text-muted">{v.sku}</td>
                        <td className="px-5 py-3">
                          <input
                            name={`variantPrice_${v.id}`}
                            defaultValue={v.price}
                            inputMode="decimal"
                            className="num h-9 w-24 rounded-lg border bg-transparent px-2.5 outline-none focus:ring-2 focus:ring-brand-500/40"
                          />
                        </td>
                        <td className="px-5 py-3">
                          <input
                            name={`variantStock_${v.id}`}
                            defaultValue={v.stock}
                            inputMode="numeric"
                            className="num h-9 w-20 rounded-lg border bg-transparent px-2.5 outline-none focus:ring-2 focus:ring-brand-500/40"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
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
              منتج مميّز (يظهر في الرئيسية)
            </label>
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
              {mode === "create" && (
                <Field name="stock" label="الكمية الأولية في المخزون" defaultValue="0" inputMode="numeric" className="num" error={err("stock")} />
              )}
              {mode === "edit" && data.variants.length === 1 && (
                <Field name="stock" label="الكمية في المخزون" defaultValue={String(data.variants[0].stock)} inputMode="numeric" className="num" error={err("stock")} />
              )}
            </div>
          </section>

          <Button type="submit" size="lg" className="w-full" disabled={isPending}>
            {isPending ? "جارٍ الحفظ…" : mode === "create" ? "إنشاء المنتج" : "حفظ التغييرات"}
          </Button>
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
