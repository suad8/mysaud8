import Link from "next/link";

const COLUMNS = [
  { title: "المتجر", links: [["كل المنتجات", "/c/coffee-beans"], ["الماتشا", "/c/matcha"], ["أدوات التحضير", "/c/brewing"], ["الهدايا", "/c/gifts"]] },
  { title: "المساعدة", links: [["الشحن والتوصيل", "/"], ["الاستبدال والإرجاع", "/"], ["طرق الدفع", "/"], ["تواصل معنا", "/"]] },
  { title: "عن فنجان", links: [["قصتنا", "/"], ["دليل التحضير", "/"], ["سياسة الخصوصية", "/"], ["الشروط والأحكام", "/"]] },
] as const;

export function Footer() {
  return (
    <footer className="relative mt-20 overflow-hidden border-t bg-[var(--surface-raised)]">
      <div
        aria-hidden
        className="blob -end-24 -top-24 h-72 w-72 bg-brand-50 dark:bg-brand-950/40"
      />

      <div className="relative mx-auto max-w-7xl px-4 py-14">
        {/* النشرة البريدية */}
        <div className="surface-card flex flex-col items-center gap-5 bg-brand-50 p-8 text-center dark:bg-brand-950/40 sm:flex-row sm:justify-between sm:text-start lg:p-10">
          <div>
            <h3 className="text-xl font-bold tracking-tight">انضم لنادي فنجان</h3>
            <p className="mt-1.5 text-sm text-muted">عروض التحميص الجديد ودليل التحضير، مباشرة لبريدك.</p>
          </div>
          <form className="flex w-full max-w-sm gap-2">
            <input
              type="email"
              placeholder="بريدك الإلكتروني"
              className="h-12 flex-1 rounded-full border bg-[var(--surface-raised)] px-5 text-sm outline-none focus:ring-2 focus:ring-brand-500/40"
            />
            <button className="h-12 shrink-0 rounded-full bg-accent-500 px-6 text-sm font-semibold text-white transition-colors hover:bg-accent-600">
              اشتراك
            </button>
          </form>
        </div>

        <div className="mt-14 grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-2xl bg-brand-700 text-lg font-bold text-white">ف</span>
              <span className="text-lg font-bold">فنجان</span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
              قهوة مختصة تُحمَّص طازجة وماتشا يابانية فاخرة، مع أدوات تحضير مختارة بعناية — من الرياض إلى بابك في كل مدن المملكة.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["مدى", "Apple Pay", "فيزا", "ماستركارد", "تابي"].map((m) => (
                <span key={m} className="rounded-lg border px-2.5 py-1.5 text-[11px] font-medium text-muted">
                  {m}
                </span>
              ))}
            </div>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-sm font-semibold">{col.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map(([label, href]) => (
                  <li key={label}>
                    <Link href={href} className="text-sm text-muted transition-colors hover:text-[var(--text-strong)]">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© <span className="num">2026</span> فنجان. جميع الحقوق محفوظة.</p>
          <p>الأسعار تشمل ضريبة القيمة المضافة <span className="num">15%</span> · س.ت <span className="num">1010000000</span></p>
        </div>
      </div>
    </footer>
  );
}
