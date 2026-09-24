import Link from "next/link";
import { Topbar } from "@/components/admin/Topbar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { db } from "@/server/db";
import { formatNumber } from "@/lib/format";
import { createCategoryAction, deleteCategoryAction, updateCategoryAction } from "@/server/categories/actions";

const inputCls = "h-10 w-full rounded-lg border bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-brand-500/40";

export default async function AdminCategoriesPage() {
  const categories = await db.category.findMany({
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { products: true, children: true } } },
  });

  return (
    <>
      <Topbar title="التصنيفات" subtitle={`${formatNumber(categories.length)} تصنيف — تظهر في قائمة المتجر العلوية والصفحة الرئيسية`} />
      <div className="space-y-6 p-5 lg:p-8">
        <section className="surface-card p-5">
          <h2 className="text-sm font-semibold">إضافة تصنيف</h2>
          <form action={createCategoryAction} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_2fr_auto] sm:items-end">
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium text-muted">الاسم</span>
              <input name="nameAr" required placeholder="مثال: كروت شخصية" className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium text-muted">الرابط (اختياري)</span>
              <input name="slug" placeholder="يُولَّد تلقائياً من الاسم" dir="ltr" className={inputCls} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium text-muted">وصف مختصر (اختياري)</span>
              <input name="descAr" className={inputCls} />
            </label>
            <Button type="submit" size="sm">إضافة</Button>
          </form>
        </section>

        <section className="surface-card overflow-hidden">
          {categories.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted">لا توجد تصنيفات بعد.</p>
          ) : (
            <ul className="divide-y">
              {categories.map((c) => {
                const locked = c._count.products > 0 || c._count.children > 0;
                return (
                  <li key={c.id} className="p-4">
                    <form action={updateCategoryAction.bind(null, c.id)} className="grid gap-3 lg:grid-cols-[70px_1fr_2fr_auto_auto] lg:items-end">
                      <label className="block text-sm">
                        <span className="mb-1 block text-xs font-medium text-muted">الترتيب</span>
                        <input name="position" type="number" min={0} defaultValue={c.position} className={`${inputCls} num`} />
                      </label>
                      <label className="block text-sm">
                        <span className="mb-1 flex items-center gap-2 text-xs font-medium text-muted">
                          الاسم
                          <Link href={`/c/${c.slug}`} target="_blank" className="text-brand-700 hover:underline">عرض ↗</Link>
                        </span>
                        <input name="nameAr" required defaultValue={c.nameAr} className={inputCls} />
                      </label>
                      <label className="block text-sm">
                        <span className="mb-1 block text-xs font-medium text-muted">الوصف</span>
                        <input name="descAr" defaultValue={c.descAr ?? ""} className={inputCls} />
                      </label>
                      <label className="flex h-10 items-center gap-2 whitespace-nowrap text-sm">
                        <input type="checkbox" name="isActive" defaultChecked={c.isActive} className="h-4 w-4 accent-brand-600" />
                        ظاهر بالمتجر
                      </label>
                      <Button type="submit" size="sm" variant="secondary">حفظ</Button>
                    </form>
                    <div className="mt-2 flex items-center gap-3 text-xs text-muted">
                      <Badge tone={c.isActive ? "green" : "gray"}>{c.isActive ? "ظاهر" : "مخفي"}</Badge>
                      <span className="num">{formatNumber(c._count.products)} منتج</span>
                      {locked ? (
                        <span>لا يمكن حذفه لأن فيه منتجات — أخفِه بدلاً من ذلك أو انقل منتجاته.</span>
                      ) : (
                        <form action={deleteCategoryAction.bind(null, c.id)}>
                          <button type="submit" className="text-red-600 hover:underline">حذف</button>
                        </form>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
