import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Price } from "@/components/ui/Price";
import { Rating } from "@/components/ui/Rating";
import { ProductCard, type ProductCardData } from "@/components/storefront/ProductCard";
import {
  getActiveProductCount,
  getCategories,
  getFeaturedProducts,
  getNewArrivals,
  getPromoProduct,
  getTestimonials,
} from "@/server/catalog/queries";
import { getHeroContent, getStoreInfoSettings } from "@/server/settings";
import { formatNumber } from "@/lib/format";
import { toJsonLd } from "@/lib/json-ld";
import { SITE_URL } from "@/lib/constants";

type CardDisplay = { slug: string; nameAr: string; imageUrl: string; price: number; rating: number };

function cardToDisplay(p: ProductCardData): CardDisplay {
  return { slug: p.slug, nameAr: p.nameAr, imageUrl: p.imageUrl, price: p.price, rating: p.rating };
}

const TRUST = [
  { title: "تحميص أسبوعي", desc: "حبوب طازجة دائماً", icon: "M12 2c4 4 6 7 6 11a6 6 0 1 1-12 0c0-4 2-7 6-11Z" },
  { title: "شحن سريع", desc: "خلال 1–3 أيام عمل", icon: "M3 7h11v8H3zM14 10h4l3 3v2h-7z M7 18a2 2 0 100-4 2 2 0 000 4zM17 18a2 2 0 100-4 2 2 0 000 4z" },
  { title: "دفع آمن", desc: "مدى و Apple Pay وتابي", icon: "M5 10V7a7 7 0 0 1 14 0v3M4 10h16v10H4z" },
  { title: "ضمان الجودة", desc: "استرجاع خلال 14 يوماً", icon: "M12 2l8 4v6c0 5-3.4 8.7-8 10-4.6-1.3-8-5-8-10V6zM9 12l2 2 4-4" },
];

const AVATAR_COLORS = ["bg-brand-500", "bg-accent-500", "bg-brand-300"];

export default async function HomePage() {
  const [featured, arrivals, categories, testimonials, bundle, productCount, hero, storeInfo] = await Promise.all([
    getFeaturedProducts(8),
    getNewArrivals(4),
    getCategories(),
    getTestimonials(3),
    getPromoProduct(),
    getActiveProductCount(),
    getHeroContent(),
    getStoreInfoSettings(),
  ]);

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: storeInfo.name,
    description: storeInfo.tagline || undefined,
    url: SITE_URL,
    logo: storeInfo.logoUrl ? `${SITE_URL}${storeInfo.logoUrl}` : undefined,
  };

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: storeInfo.name,
    url: SITE_URL,
  };

  // صورة البانر والبطاقة العائمة تُختاران من الكتالوج الفعلي (المميّز ثم الأحدث)
  // بدل الاعتماد على منتجات محدَّدة سلفاً قد لا تكون موجودة في متجر حقيقي.
  const pool = [...featured, ...arrivals];
  const autoHero: CardDisplay | null = pool[0] ? cardToDisplay(pool[0]) : null;
  const secondCandidate = pool.find((p) => p.slug !== autoHero?.slug);
  const secondDisplay: CardDisplay | null = secondCandidate ? cardToDisplay(secondCandidate) : null;
  // صورة البانر: مخصّصة من لوحة التحكم إن وُجدت، وإلا صورة المنتج المختار تلقائياً
  const heroImageUrl = hero.imageUrl || autoHero?.imageUrl;
  const heroImageAlt = hero.imageUrl ? hero.headline : (autoHero?.nameAr ?? "");

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLd(organizationJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLd(websiteJsonLd) }} />

      {/* ── البانر الرئيسي ─────────────────────────────────── */}
      <section className="relative overflow-hidden bg-brand-50 dark:bg-ink-950">
        <div aria-hidden className="blob -end-32 -top-40 h-96 w-96 bg-brand-100 dark:bg-brand-950/60" />
        <div aria-hidden className="blob -start-24 bottom-0 h-72 w-72 bg-accent-100 dark:bg-accent-900/20" />

        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-200 dark:bg-ink-900 dark:text-brand-300 dark:ring-brand-800">
              <span className="h-1.5 w-1.5 rounded-full bg-accent-500" />
              {hero.eyebrow}
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.15] tracking-tight text-ink-900 dark:text-white sm:text-5xl lg:text-6xl">
              {hero.headline}
              <br />
              <span className="text-brand-600 dark:text-brand-400">{hero.headlineHighlight}</span>
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-muted">{hero.subtitle}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href={hero.ctaHref} size="lg">
                {hero.ctaText}
              </Button>
              <Button href={hero.secondaryCtaHref} variant="accent" size="lg">
                {hero.secondaryCtaText}
              </Button>
            </div>
            <dl className="mt-10 flex items-center gap-6 sm:gap-8">
              {[["+2,400", "عميل سعيد"], ["4.8", "متوسط التقييم"], [formatNumber(productCount), "منتج مختار"]].map(([v, l], i) => (
                <div key={l} className="flex items-center gap-6 sm:gap-8">
                  {i > 0 && <span className="h-9 w-px bg-[var(--border-subtle)]" />}
                  <div>
                    <dt className="num text-2xl font-extrabold text-ink-900 dark:text-white">{v}</dt>
                    <dd className="mt-0.5 text-xs text-muted">{l}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>

          {/* الصورة والعناصر العائمة */}
          <div className="relative">
            <div aria-hidden className="blob inset-0 m-auto h-[85%] w-[85%] bg-gradient-to-br from-brand-200 to-accent-100 dark:from-brand-900 dark:to-accent-900/40" />
            {heroImageUrl && (
              <div className="relative aspect-square overflow-hidden rounded-[2rem] shadow-[var(--shadow-lift)]">
                <Image src={heroImageUrl} alt={heroImageAlt} fill sizes="(max-width: 1024px) 90vw, 45vw" className="object-cover" priority />
              </div>
            )}

            {/* شارة عملاء عائمة */}
            <div className="absolute -top-4 start-4 flex items-center gap-2.5 rounded-2xl bg-white/95 p-3 pe-4 shadow-[var(--shadow-lift)] backdrop-blur dark:bg-ink-900/95 sm:start-8">
              <div className="flex -space-x-2 rtl:space-x-reverse">
                {AVATAR_COLORS.map((c, i) => (
                  <span key={i} className={`h-8 w-8 rounded-full ring-2 ring-white dark:ring-ink-900 ${c}`} />
                ))}
              </div>
              <div>
                <p className="text-xs font-bold leading-tight">+2,400 عميل</p>
                <p className="text-[11px] leading-tight text-muted">يثقون بفنجان</p>
              </div>
            </div>

            {/* بطاقة منتج عائمة */}
            {secondDisplay && (
              <Link
                href={`/p/${secondDisplay.slug}`}
                className="absolute -bottom-6 end-2 flex items-center gap-3 rounded-2xl bg-white p-3 pe-5 shadow-[var(--shadow-lift)] transition-transform hover:-translate-y-0.5 dark:bg-ink-900 sm:end-6"
              >
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[var(--surface-sunken)]">
                  <Image src={secondDisplay.imageUrl} alt={secondDisplay.nameAr} fill sizes="56px" className="object-cover" />
                </div>
                <div>
                  <p className="max-w-32 truncate text-xs font-bold">{secondDisplay.nameAr}</p>
                  <Rating value={secondDisplay.rating} size={11} className="mt-0.5" />
                  <Price value={secondDisplay.price} size="sm" className="mt-0.5" />
                </div>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── شريط الثقة ─────────────────────────────────────── */}
      <section className="border-b bg-[var(--surface-raised)]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px px-4 lg:grid-cols-4">
          {TRUST.map((t) => (
            <div key={t.title} className="flex items-center gap-3 py-5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-50 dark:bg-brand-950">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 stroke-brand-600 dark:stroke-brand-400">
                  <path d={t.icon} />
                </svg>
              </span>
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
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
              اكتشف عالمنا
            </span>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight">تسوّق حسب الفئة</h2>
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
      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-14">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight">الأكثر طلباً</h2>
              <p className="mt-1.5 text-sm text-muted">اختيارات عملائنا هذا الشهر</p>
            </div>
            <Link href="/c/coffee-beans" className="shrink-0 text-sm font-semibold text-brand-700 hover:underline">
              عرض الكل ←
            </Link>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {featured.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* ── بندل العرض ─────────────────────────────────────── */}
      {bundle && (
        <section className="mx-auto max-w-7xl px-4 pb-14">
          <div className="surface-card relative overflow-hidden bg-brand-900 text-white">
            <div aria-hidden className="blob -end-20 -top-20 h-64 w-64 bg-brand-700/60" />
            <div aria-hidden className="blob -start-16 -bottom-16 h-56 w-56 bg-accent-500/30" />
            <div className="relative grid gap-8 p-8 lg:grid-cols-2 lg:items-center lg:p-14">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold ring-1 ring-inset ring-white/20">
                  بندل التجربة الكاملة
                </span>
                <h2 className="mt-4 text-2xl font-extrabold leading-snug tracking-tight lg:text-3xl">
                  {bundle.nameAr}
                </h2>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-brand-100">{bundle.descAr}</p>
                <div className="mt-6 flex items-baseline gap-3">
                  <Price value={bundle.basePrice} compareAt={bundle.comparePrice} size="lg" className="text-white [&_.text-muted]:text-brand-200" />
                </div>
                <Button href={`/p/${bundle.slug}`} variant="accent" size="lg" className="mt-6">
                  جرّب الطقس الآن
                </Button>
              </div>
              <div className="relative mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-[2rem] shadow-[var(--shadow-lift)] lg:max-w-sm">
                <Image src={bundle.images[0]?.url ?? "/products/placeholder.svg"} alt={bundle.nameAr} fill sizes="384px" className="object-cover" />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── آراء العملاء ───────────────────────────────────── */}
      {testimonials.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-14">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
              آراء حقيقية
            </span>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight">عملاؤنا هم سر نجاحنا</h2>
          </div>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {testimonials.map((t) => (
              <div key={t.id} className="surface-card p-6">
                <Rating value={t.rating} />
                <p className="mt-4 text-sm leading-relaxed">"{t.comment}"</p>
                <div className="mt-5 flex items-center gap-3 border-t pt-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700 dark:bg-brand-900 dark:text-brand-300">
                    {t.authorName.slice(0, 1)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold">{t.authorName}</p>
                    <p className="truncate text-[11px] text-muted">اشترى {t.productName}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── وصل حديثاً ─────────────────────────────────────── */}
      {arrivals.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-14">
          <h2 className="text-2xl font-extrabold tracking-tight">وصل حديثاً</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {arrivals.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* ── دعوة أخيرة ─────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-brand-50 py-16 text-center dark:bg-ink-950">
        <div aria-hidden className="blob start-1/2 top-0 h-[120%] w-[140%] -translate-x-1/2 rtl:translate-x-1/2 bg-gradient-to-b from-brand-100 to-transparent dark:from-brand-950/50" />
        <div className="relative mx-auto max-w-2xl px-4">
          <h2 className="text-3xl font-extrabold tracking-tight text-ink-900 dark:text-white sm:text-4xl">
            ابدأ يومك بفنجان مثالي
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            اشترك الآن واحصل على خصم <span className="num font-semibold">10%</span> على أول طلب بكود{" "}
            <code className="num rounded bg-white px-2 py-1 font-semibold dark:bg-ink-900">WELCOME10</code>
          </p>
          <Button href="/c/coffee-beans" variant="accent" size="lg" className="mt-6">
            تسوّق الآن
          </Button>
        </div>
      </section>
    </>
  );
}
