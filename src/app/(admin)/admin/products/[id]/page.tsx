import { notFound } from "next/navigation";
import Image from "next/image";
import { Topbar } from "@/components/admin/Topbar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { db } from "@/server/db";

type Props = { params: Promise<{ id: string }> };

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;
  const product = await db.product.findUnique({
    where: { id },
    include: { images: { orderBy: { position: "asc" } }, variants: { include: { inventory: true } }, category: true },
  });
  if (!product) notFound();

  return (
    <>
      <Topbar
        title={product.nameAr}
        subtitle="تعديل بيانات المنتج"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" size="sm">إلغاء</Button>
            <Button size="sm">حفظ التغييرات</Button>
          </div>
        }
      />

      <div className="grid gap-6 p-5 lg:grid-cols-3 lg:p-8">
        <div className="space-y-6 lg:col-span-2">
          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold">المعلومات الأساسية</h2>
            <div className="mt-4 space-y-4">
              <FieldGroup label="اسم المنتج">
                <input defaultValue={product.nameAr} className="h-11 w-full rounded-xl border bg-transparent px-3.5 outline-none focus:ring-2 focus:ring-brand-500/40" />
              </FieldGroup>
              <FieldGroup label="الوصف المختصر">
                <input defaultValue={product.shortDescAr ?? ""} className="h-11 w-full rounded-xl border bg-transparent px-3.5 outline-none focus:ring-2 focus:ring-brand-500/40" />
              </FieldGroup>
              <FieldGroup label="الوصف الكامل">
                <textarea defaultValue={product.descAr ?? ""} rows={5} className="w-full rounded-xl border bg-transparent px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-brand-500/40" />
              </FieldGroup>
            </div>
          </section>

          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold">الصور</h2>
            <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-5">
              {product.images.map((img) => (
                <div key={img.id} className="relative aspect-square overflow-hidden rounded-xl bg-[var(--surface-sunken)]">
                  <Image src={img.url} alt="" fill sizes="120px" className="object-cover" />
                </div>
              ))}
              <button className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-muted hover:border-brand-400 hover:text-brand-600">
                <span className="text-2xl leading-none">+</span>
                <span className="text-[11px]">إضافة</span>
              </button>
            </div>
          </section>

          <section className="surface-card overflow-hidden">
            <div className="flex items-center justify-between p-5 pb-0">
              <h2 className="text-sm font-semibold">المتغيّرات والمخزون</h2>
              <button className="text-xs font-medium text-brand-700 hover:underline">+ إضافة متغيّر</button>
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
                  {product.variants.map((v) => (
                    <tr key={v.id} className="border-t">
                      <td className="px-5 py-3 font-medium">{v.nameAr}</td>
                      <td className="num px-5 py-3 text-muted">{v.sku}</td>
                      <td className="px-5 py-3">
                        <input defaultValue={v.price.toString()} className="num h-9 w-24 rounded-lg border bg-transparent px-2.5 outline-none focus:ring-2 focus:ring-brand-500/40" />
                      </td>
                      <td className="px-5 py-3">
                        <input defaultValue={v.inventory?.onHand ?? 0} className="num h-9 w-20 rounded-lg border bg-transparent px-2.5 outline-none focus:ring-2 focus:ring-brand-500/40" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold">الحالة</h2>
            <div className="mt-3">
              <Badge tone={product.status === "ACTIVE" ? "green" : "gray"}>
                {product.status === "ACTIVE" ? "منشور" : product.status === "DRAFT" ? "مسودة" : "مؤرشف"}
              </Badge>
            </div>
            <select defaultValue={product.status} className="mt-3 h-10 w-full rounded-lg border bg-transparent px-3 text-sm outline-none">
              <option value="DRAFT">مسودة</option>
              <option value="ACTIVE">منشور</option>
              <option value="ARCHIVED">مؤرشف</option>
            </select>
          </section>

          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold">التصنيف</h2>
            <p className="mt-3 text-sm text-muted">{product.category?.nameAr ?? "بدون تصنيف"}</p>
          </section>

          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold">التسعير</h2>
            <div className="mt-4 space-y-3">
              <FieldGroup label="السعر الأساسي">
                <input defaultValue={product.basePrice.toString()} className="num h-11 w-full rounded-xl border bg-transparent px-3.5 outline-none focus:ring-2 focus:ring-brand-500/40" />
              </FieldGroup>
              <FieldGroup label="سعر ما قبل الخصم">
                <input defaultValue={product.comparePrice?.toString() ?? ""} className="num h-11 w-full rounded-xl border bg-transparent px-3.5 outline-none focus:ring-2 focus:ring-brand-500/40" />
              </FieldGroup>
              <FieldGroup label="التكلفة (داخلي)">
                <input defaultValue={product.costPrice?.toString() ?? ""} className="num h-11 w-full rounded-xl border bg-transparent px-3.5 outline-none focus:ring-2 focus:ring-brand-500/40" />
              </FieldGroup>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-muted">{label}</span>
      {children}
    </label>
  );
}
