import Link from "next/link";
import { Topbar } from "@/components/admin/Topbar";
import { ThemeForm } from "@/components/admin/ThemeForm";
import { db } from "@/server/db";
import { getThemeSettings } from "@/server/settings";
import { getLinkOptions } from "@/server/settings/link-options";
import { deleteSubscriberAction } from "@/server/newsletter/actions";
import { formatDate, formatNumber } from "@/lib/format";
import { requireAdminPage } from "@/server/auth/session";

export default async function AdminThemePage() {
  await requireAdminPage();
  const [theme, subscribers, linkOptions] = await Promise.all([
    getThemeSettings(),
    db.newsletterSubscriber.findMany({ orderBy: { createdAt: "desc" } }),
    getLinkOptions({ withProducts: true }),
  ]);

  return (
    <>
      <Topbar title="الثيم" subtitle="ألوان المتجر، القائمة العلوية، صفحة المنتج، والفوتر" />
      <div className="space-y-5 p-5 pb-28 lg:p-8 lg:pb-28">
        <Link href="/admin/homepage" className="surface-card flex items-center justify-between gap-4 p-5 transition-colors hover:border-brand-300">
          <div>
            <h2 className="text-sm font-semibold">أقسام الصفحة الرئيسية انتقلت إلى «تصميم الرئيسية» ←</h2>
            <p className="mt-0.5 text-xs text-muted">البانر، السلايدر، المنتجات البارزة، البنرات، الفيديو… أضف واحذف ورتّب أي قسم.</p>
          </div>
          <span className="shrink-0 rounded-full bg-brand-700 px-4 py-2 text-xs font-semibold text-white">فتح المصمّم</span>
        </Link>

        <ThemeForm theme={theme} linkOptions={linkOptions} />

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
