import { Topbar } from "@/components/admin/Topbar";
import { HeroBannerForm } from "@/components/admin/HeroBannerForm";
import { ThemeForm } from "@/components/admin/ThemeForm";
import { db } from "@/server/db";
import { getHeroContent, getHomepageSections, getThemeSettings } from "@/server/settings";
import { deleteSubscriberAction } from "@/server/newsletter/actions";
import { formatDate, formatNumber } from "@/lib/format";
import { requireAdminPage } from "@/server/auth/session";

export default async function AdminThemePage() {
  await requireAdminPage();
  const [hero, theme, visibility, products, subscribers] = await Promise.all([
    getHeroContent(),
    getThemeSettings(),
    getHomepageSections(),
    db.product.findMany({
      where: { status: "ACTIVE", deletedAt: null },
      select: { id: true, slug: true, nameAr: true, isFeatured: true },
      orderBy: { nameAr: "asc" },
    }),
    db.newsletterSubscriber.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <>
      <Topbar title="الثيم" subtitle="تحكّم كامل بتصميم المتجر ومحتواه" />
      <div className="space-y-5 p-5 pb-28 lg:p-8 lg:pb-28">
        <details open className="surface-card group p-5">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">البانر الرئيسي</h2>
              <p className="mt-0.5 text-xs text-muted">الصورة، العناوين، الأزرار، البطاقة العائمة، والإحصائيات — له زر حفظ مستقل.</p>
            </div>
            <span className="text-muted transition-transform group-open:rotate-180">▾</span>
          </summary>
          <div className="mt-4">
            <HeroBannerForm hero={hero} products={products.map((p) => ({ slug: p.slug, nameAr: p.nameAr }))} />
          </div>
        </details>

        <ThemeForm theme={theme} visibility={visibility} products={products} />

        <section className="surface-card p-5">
          <h2 className="text-sm font-semibold">مشتركو النشرة البريدية ({formatNumber(subscribers.length)})</h2>
          {subscribers.length === 0 ? (
            <p className="mt-3 text-sm text-muted">لا يوجد مشتركون بعد.</p>
          ) : (
            <>
              <textarea
                readOnly
                rows={3}
                dir="ltr"
                value={subscribers.map((s) => s.email).join(", ")}
                className="num mt-3 w-full rounded-lg border bg-[var(--surface-sunken)] px-3 py-2 text-xs"
                aria-label="كل البريد الإلكتروني للنسخ"
              />
              <ul className="mt-3 max-h-72 divide-y overflow-y-auto rounded-lg border">
                {subscribers.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <span className="num truncate" dir="ltr">{s.email}</span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="text-xs text-muted">{formatDate(s.createdAt)}</span>
                      <form action={deleteSubscriberAction.bind(null, s.id)}>
                        <button type="submit" className="text-xs text-red-600 hover:underline">حذف</button>
                      </form>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </>
  );
}
