import Link from "next/link";

const COLUMNS = [
  { title: "المتجر", links: [["كل المنتجات", "/c/skincare"], ["الجديد", "/"], ["العروض", "/"], ["الهدايا", "/c/gifts"]] },
  { title: "المساعدة", links: [["الشحن والتوصيل", "/"], ["الاستبدال والإرجاع", "/"], ["طرق الدفع", "/"], ["تواصل معنا", "/"]] },
  { title: "عن نسيم", links: [["قصتنا", "/"], ["الأسئلة الشائعة", "/"], ["سياسة الخصوصية", "/"], ["الشروط والأحكام", "/"]] },
] as const;

export function Footer() {
  return (
    <footer className="mt-20 border-t bg-[var(--surface-raised)]">
      <div className="mx-auto max-w-7xl px-4 py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-700 text-lg font-bold text-white">ن</span>
              <span className="text-lg font-bold">نسيم</span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
              منتجات عناية وعطور شرقية وقهوة مختصة، مختارة بعناية ومشحونة من الرياض لكل مدن المملكة.
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
          <p>© <span className="num">2026</span> نسيم. جميع الحقوق محفوظة.</p>
          <p>الأسعار تشمل ضريبة القيمة المضافة <span className="num">15%</span> · س.ت <span className="num">1010000000</span></p>
        </div>
      </div>
    </footer>
  );
}
