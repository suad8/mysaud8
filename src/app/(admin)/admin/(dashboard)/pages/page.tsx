import Link from "next/link";
import { Topbar } from "@/components/admin/Topbar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { db } from "@/server/db";
import { formatDate, formatNumber } from "@/lib/format";
import { createDefaultPagesAction, createPageAction } from "@/server/pages/actions";

const DEFAULT_SLUGS = ["about", "shipping", "returns", "privacy", "terms", "contact"];

export default async function AdminPagesPage() {
  const pages = await db.page.findMany({ orderBy: { createdAt: "asc" } });
  const missingDefaults = DEFAULT_SLUGS.filter((s) => !pages.some((p) => p.slug === s));

  return (
    <>
      <Topbar title="الصفحات" subtitle={`${formatNumber(pages.length)} صفحة — من نحن، سياسة الإرجاع، الخصوصية وغيرها`} />
      <div className="space-y-6 p-5 lg:p-8">
        {missingDefaults.length > 0 && (
          <section className="surface-card flex flex-wrap items-center justify-between gap-4 bg-brand-50 p-5 dark:bg-brand-950/40">
            <div>
              <h2 className="text-sm font-semibold">الصفحات الأساسية غير موجودة بعد</h2>
              <p className="mt-1 text-xs text-muted">
                روابط الفوتر الافتراضية تشير لصفحات (من نحن، الشحن، الإرجاع، الخصوصية، الشروط، تواصل معنا). أنشئها كمسودات ثم اكتب محتواها وانشرها.
              </p>
            </div>
            <form action={createDefaultPagesAction}>
              <Button type="submit" size="sm">إنشاء الصفحات الأساسية</Button>
            </form>
          </section>
        )}

        <section className="surface-card p-5">
          <h2 className="text-sm font-semibold">صفحة جديدة</h2>
          <form action={createPageAction} className="mt-4 grid gap-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium text-muted">العنوان</span>
              <input name="title" required placeholder="مثال: طريقة طلب تصميم مخصّص" className="h-10 w-full rounded-lg border bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-brand-500/40" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium text-muted">الرابط (اختياري)</span>
              <input name="slug" dir="ltr" placeholder="custom-design" className="num h-10 w-full rounded-lg border bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-brand-500/40" />
            </label>
            <Button type="submit" size="sm">إنشاء</Button>
          </form>
        </section>

        <section className="surface-card overflow-hidden">
          {pages.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted">لا توجد صفحات بعد.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted">
                  <th className="px-5 py-3 text-start font-medium">العنوان</th>
                  <th className="px-5 py-3 text-start font-medium">الرابط</th>
                  <th className="px-5 py-3 text-start font-medium">الحالة</th>
                  <th className="px-5 py-3 text-start font-medium">آخر تعديل</th>
                </tr>
              </thead>
              <tbody>
                {pages.map((p) => (
                  <tr key={p.id} className="border-t hover:bg-ink-50 dark:hover:bg-ink-800/40">
                    <td className="px-5 py-3 font-medium">
                      <Link href={`/admin/pages/${p.id}`} className="hover:underline">{p.title}</Link>
                    </td>
                    <td className="num px-5 py-3 text-xs text-muted" dir="ltr">/pages/{p.slug}</td>
                    <td className="px-5 py-3">
                      <Badge tone={p.isPublished ? "green" : "amber"}>{p.isPublished ? "منشورة" : "مسودة"}</Badge>
                    </td>
                    <td className="px-5 py-3 text-xs text-muted">{formatDate(p.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </>
  );
}
