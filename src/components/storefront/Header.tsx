import Link from "next/link";
import { db } from "@/server/db";

const ICON = "h-5 w-5 stroke-current";

export async function Header() {
  const categories = await db.category.findMany({
    where: { isActive: true, parentId: null },
    orderBy: { position: "asc" },
    select: { slug: true, nameAr: true },
  });

  return (
    <header className="sticky top-0 z-40 border-b bg-[var(--surface-raised)]/85 backdrop-blur-md">
      {/* شريط الإعلان العلوي */}
      <div className="bg-brand-800 text-center text-[13px] text-brand-50">
        <p className="mx-auto max-w-7xl px-4 py-2">
          حبوب تُحمَّص أسبوعياً · شحن مجاني للطلبات فوق <span className="num font-semibold">200</span> ر.س
        </p>
      </div>

      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-brand-700 text-lg font-bold text-white">
            ف
          </span>
          <span className="hidden text-lg font-bold tracking-tight sm:block">فنجان</span>
        </Link>

        <nav className="hidden flex-1 items-center gap-1 lg:flex">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/c/${c.slug}`}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-ink-100 hover:text-[var(--text-strong)] dark:hover:bg-ink-800"
            >
              {c.nameAr}
            </Link>
          ))}
        </nav>

        {/* البحث */}
        <div className="relative flex-1 lg:max-w-xs">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" className={`${ICON} pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-400`}>
            <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            placeholder="ابحث عن منتج…"
            className="h-10 w-full rounded-xl border bg-[var(--surface-sunken)] ps-10 pe-3 text-sm outline-none transition-shadow placeholder:text-ink-400 focus:ring-2 focus:ring-brand-500/40"
          />
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Link href="/account" aria-label="حسابي" className="grid h-10 w-10 place-items-center rounded-xl transition-colors hover:bg-ink-100 dark:hover:bg-ink-800">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" className={ICON}>
              <circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" strokeLinecap="round" />
            </svg>
          </Link>
          <Link href="/cart" aria-label="السلة" className="relative grid h-10 w-10 place-items-center rounded-xl transition-colors hover:bg-ink-100 dark:hover:bg-ink-800">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" className={ICON}>
              <path d="M4 6h16l-1.4 10.3a2 2 0 0 1-2 1.7H7.4a2 2 0 0 1-2-1.7Z" strokeLinejoin="round" />
              <path d="M9 10V6a3 3 0 0 1 6 0v4" strokeLinecap="round" />
            </svg>
            <span className="num absolute -top-0.5 end-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-accent-500 px-1 text-[11px] font-bold text-white">
              2
            </span>
          </Link>
        </div>
      </div>

      {/* تصنيفات الجوال */}
      <nav className="scroll-x flex gap-2 border-t px-4 py-2 lg:hidden">
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={`/c/${c.slug}`}
            className="shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-medium text-muted"
          >
            {c.nameAr}
          </Link>
        ))}
      </nav>
    </header>
  );
}
