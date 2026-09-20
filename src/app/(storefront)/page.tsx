import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ProductCard } from "@/components/storefront/ProductCard";
import { getCategories, getFeaturedProducts, getNewArrivals } from "@/server/catalog/queries";
import { formatNumber } from "@/lib/format";

const TRUST = [
  { title: "شحن سريع", desc: "خلال 1–3 أيام عمل", icon: "M3 7h11v8H3zM14 10h4l3 3v2h-7z M7 18a2 2 0 100-4 2 2 0 000 4zM17 18a2 2 0 100-4 2 2 0 000 4z" },
  { title: "إرجاع مجاني", desc: "خلال 14 يوماً", icon: "M3 12a9 9 0 1 0 3-6.7M3 4v5h5" },
  { title: "دفع آمن", desc: "مدى و Apple Pay وتابي", icon: "M5 10V7a7 7 0 0 1 14 0v3M4 10h16v10H4z" },
  { title: "منتجات أصلية", desc: "بضمان الوكيل", icon: "M12 2l8 4v6c0 5-3.4 8.7-8 10-4.6-1.3-8-5-8-10V6zM9 12l2 2 4-4" },
];

export default async function HomePage() {
  const [featured, arrivals, categories] = await Promise.all([
    getFeaturedProducts(8),
    getNewArrivals(4),
    getCategories(),
  ]);

  return (
    <>
      {/* ── البانر الرئيسي ─────────────────────────────────── */}
      <section className="relative overflow-hidden bg-brand-900 text-white">
        <div
          aria-hidden
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(60% 80% at 80% 20%, #14a97c 0%, transparent 60%), radial-gradient(50% 70% at 10% 90%, #d4a544 0%, transparent 55%)",
          }}
        />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-medium ring-1 ring-inset ring-white/20">
              <span className="h-1.5 w-1.5 rounded-full bg-gold-400" />
              مجموعة الخريف وصلت
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-[1.15] tracking-tight sm:text-5xl lg:text-6xl">
              عناية تليق بك،
              <br />
              <span className="text-gold-400">وعطر يبقى معك</span>
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-brand-100">
              منتجات مختارة بعناية من العناية بالبشرة والعطور الشرقية والقهوة المختصة — تصلك لباب البيت في كل مدن المملكة.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href="/c/fragrance" variant="gold" size="lg">
                تسوّق الآن
              </Button>
              <Button
                href="/c/gifts"
                size="lg"
                className="bg-white/10 text-white ring-1 ring-inset ring-white/25 hover:bg-white/20"
              >
                علب الهدايا
              </Button>
            </div>
            <dl className="mt-10 flex gap-8">
              {[["+12k", "عميل سعيد"], ["4.8", "متوسط التقييم"], ["48h", "متوسط التوصيل"]].map(([v, l]) => (
                <div key={l}>
                  <dt className="num text-2xl font-bold text-gold-400">{v}</dt>
                  <dd className="mt-0.5 text-xs text-brand-200">{l}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative hidden lg:block">
            <div className="grid grid-cols-2 gap-4">
              {featured.slice(0, 4).map((p, i) => (
                <div
                  key={p.slug}
                  className={`relative aspect-square overflow-hidden rounded-2xl ring-1 ring-white/15 ${i % 2 ? "translate-y-8" : ""}`}
                >
                  <Image src={p.imageUrl} alt={p.nameAr} fill sizes="25vw" className="object-cover" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── شريط الثقة ─────────────────────────────────────── */}
      <section className="border-b bg-[var(--surface-raised)]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px px-4 lg:grid-cols-4">
          {TRUST.map((t) => (
            <div key={t.title} className="flex items-center gap-3 py-5">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 shrink-0 stroke-brand-600">
                <path d={t.icon} />
              </svg>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{t.title}</p>
                <p className="truncate text-xs text-muted">{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── التصنيفات ──────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-14">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">تسوّق حسب الفئة</h2>
            <p className="mt-1.5 text-sm text-muted">خمس فئات، كل واحدة مختارة بعناية</p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {categories.map((c) => (
            <Link
              key={c.slug}
              href={`/c/${c.slug}`}
              className="surface-card group flex flex-col gap-1 p-5 transition-all hover:border-brand-300 hover:shadow-[var(--shadow-soft)]"
            >
              <span className="text-sm font-semibold transition-colors group-hover:text-brand-700">{c.nameAr}</span>
              <span className="num text-xs text-muted">{formatNumber(c._count.products)} منتج</span>
              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted">{c.descAr}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── المنتجات المميزة ───────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pb-14">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">الأكثر طلباً</h2>
            <p className="mt-1.5 text-sm text-muted">اختيارات عملائنا هذا الشهر</p>
          </div>
          <Link href="/c/skincare" className="shrink-0 text-sm font-medium text-brand-700 hover:underline">
            عرض الكل ←
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {featured.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      </section>

      {/* ── شريط عرض ───────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pb-14">
        <div className="surface-card overflow-hidden bg-gold-50 dark:bg-gold-900/20">
          <div className="flex flex-col items-center gap-6 p-8 text-center sm:flex-row sm:justify-between sm:text-start lg:p-12">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gold-700 dark:text-gold-400">
                عرض لفترة محدودة
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight lg:text-3xl">
                خصم <span className="num">10%</span> على أول طلب
              </h2>
              <p className="mt-2 text-sm text-muted">
                استخدم كود <code className="num rounded bg-[var(--surface-raised)] px-2 py-1 font-semibold">WELCOME10</code> عند الدفع
              </p>
            </div>
            <Button href="/c/fragrance" variant="gold" size="lg">
              ابدأ التسوّق
            </Button>
          </div>
        </div>
      </section>

      {/* ── وصل حديثاً ─────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pb-6">
        <h2 className="text-2xl font-bold tracking-tight">وصل حديثاً</h2>
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {arrivals.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      </section>
    </>
  );
}
