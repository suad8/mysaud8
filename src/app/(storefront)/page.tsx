import { Fragment } from "react";
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
  getProductBySlug,
  getProductCardBySlug,
  getPromoProduct,
  getTestimonials,
} from "@/server/catalog/queries";
import { getHeroContent, getHomepageSections, getStoreInfoSettings, getThemeSettings } from "@/server/settings";
import { formatNumber } from "@/lib/format";
import { toJsonLd } from "@/lib/json-ld";
import { SITE_URL } from "@/lib/constants";
import { HERO_PRODUCT_HIDDEN, type HomepageSectionKey } from "@/lib/theme";

type CardDisplay = { slug: string; nameAr: string; imageUrl: string; price: number; rating: number };

function cardToDisplay(p: ProductCardData): CardDisplay {
  return { slug: p.slug, nameAr: p.nameAr, imageUrl: p.imageUrl, price: p.price, rating: p.rating };
}

/** أيقونات ثابتة لخانات شريط المزايا الأربع — النصوص نفسها من الثيم. */
const TRUST_ICONS = [
  "M12 2c4 4 6 7 6 11a6 6 0 1 1-12 0c0-4 2-7 6-11Z",
  "M3 7h11v8H3zM14 10h4l3 3v2h-7z M7 18a2 2 0 100-4 2 2 0 000 4zM17 18a2 2 0 100-4 2 2 0 000 4z",
  "M5 10V7a7 7 0 0 1 14 0v3M4 10h16v10H4z",
  "M12 2l8 4v6c0 5-3.4 8.7-8 10-4.6-1.3-8-5-8-10V6zM9 12l2 2 4-4",
];

const AVATAR_COLORS = ["bg-brand-500", "bg-accent-500", "bg-brand-300"];

export default async function HomePage() {
  const [theme, hero, storeInfo, sections] = await Promise.all([
    getThemeSettings(),
    getHeroContent(),
    getStoreInfoSettings(),
    getHomepageSections(),
  ]);

  const [featured, arrivals, categories, testimonials, productCount, chosenBundle, chosenFloating] = await Promise.all([
    getFeaturedProducts(theme.featuredCount, theme.featuredOrder),
    getNewArrivals(theme.arrivalsCount),
    getCategories(),
    getTestimonials(3),
    getActiveProductCount(),
    theme.bundleProductSlug ? getProductBySlug(theme.bundleProductSlug) : Promise.resolve(null),
    hero.floatingProductSlug && hero.floatingProductSlug !== HERO_PRODUCT_HIDDEN
      ? getProductCardBySlug(hero.floatingProductSlug)
      : Promise.resolve(null),
  ]);
  // المنتج المختار للعرض الترويجي قد يُلغى نشره لاحقاً — نرجع للاختيار التلقائي
  const bundle = chosenBundle ?? (await getPromoProduct());

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

  // صورة البانر: مخصّصة من الثيم إن وُجدت، وإلا صورة أول منتج بارز/حديث
  const pool = [...featured, ...arrivals];
  const autoHero: CardDisplay | null = pool[0] ? cardToDisplay(pool[0]) : null;
  const autoSecond = pool.find((p) => p.slug !== autoHero?.slug);
  const floating: CardDisplay | null =
    hero.floatingProductSlug === HERO_PRODUCT_HIDDEN
      ? null
      : chosenFloating
        ? cardToDisplay(chosenFloating)
        : autoSecond
          ? cardToDisplay(autoSecond)
          : null;
  // بلا صورة بانر ولا منتجات بعد: شعار المتجر نفسه كصورة البانر بدل مساحة فارغة
  const heroIsLogo = !hero.imageUrl && !autoHero && Boolean(storeInfo.logoUrl);
  const heroImageUrl = hero.imageUrl || autoHero?.imageUrl || (heroIsLogo ? storeInfo.logoUrl : undefined);
  const heroImageAlt = hero.imageUrl ? hero.headline : heroIsLogo ? storeInfo.name : (autoHero?.nameAr ?? "");

  const stats = [
    hero.stat1Value ? { value: hero.stat1Value, label: hero.stat1Label } : null,
    hero.stat2Value ? { value: hero.stat2Value, label: hero.stat2Label } : null,
    productCount > 0 ? { value: formatNumber(productCount), label: "منتج مختار" } : null,
  ].filter((s): s is { value: string; label: string } => s !== null);

  const trustItems = theme.trustItems.map((t, i) => ({ ...t, icon: TRUST_ICONS[i % TRUST_ICONS.length] })).filter((t) => t.title);

  const render: Record<HomepageSectionKey, () => React.ReactNode> = {
    hero: () => (
      <section className="relative overflow-hidden bg-brand-50 dark:bg-ink-950">
        <div aria-hidden className="blob -end-32 -top-40 h-96 w-96 bg-brand-100 dark:bg-brand-950/60" />
        <div aria-hidden className="blob -start-24 bottom-0 h-72 w-72 bg-accent-100 dark:bg-accent-900/20" />

        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
          <div>
            {hero.eyebrow && (
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-brand-700 ring-1 ring-inset ring-brand-200 dark:bg-ink-900 dark:text-brand-300 dark:ring-brand-800">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-500" />
                {hero.eyebrow}
              </span>
            )}
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.15] tracking-tight text-ink-900 dark:text-white sm:text-5xl lg:text-6xl">
              {hero.headline}
              <br />
              <span className="text-brand-600 dark:text-brand-400">{hero.headlineHighlight}</span>
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-muted">{hero.subtitle}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              {hero.ctaText && (
                <Button href={hero.ctaHref} size="lg">
                  {hero.ctaText}
                </Button>
              )}
              {hero.secondaryCtaText && (
                <Button href={hero.secondaryCtaHref} variant="accent" size="lg">
                  {hero.secondaryCtaText}
                </Button>
              )}
            </div>
            <dl className="mt-10 flex items-center gap-6 sm:gap-8">
              {stats.map((s, i) => (
                <div key={s.label + i} className="flex items-center gap-6 sm:gap-8">
                  {i > 0 && <span className="h-9 w-px bg-[var(--border-subtle)]" />}
                  <div>
                    <dt className="num text-2xl font-extrabold text-ink-900 dark:text-white">{s.value}</dt>
                    <dd className="mt-0.5 text-xs text-muted">{s.label}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative">
            <div aria-hidden className="blob inset-0 m-auto h-[85%] w-[85%] bg-gradient-to-br from-brand-200 to-accent-100 dark:from-brand-900 dark:to-accent-900/40" />
            {heroImageUrl && (
              <div className={`relative aspect-square overflow-hidden rounded-[2rem] ${heroIsLogo ? "" : "shadow-[var(--shadow-lift)]"}`}>
                <Image
                  src={heroImageUrl}
                  alt={heroImageAlt}
                  fill
                  sizes="(max-width: 1024px) 90vw, 45vw"
                  className={heroIsLogo ? "object-contain p-[18%]" : "object-cover"}
                  priority
                />
              </div>
            )}

            {hero.badgeText && (
              <div className="absolute -top-4 start-4 flex items-center gap-2.5 rounded-2xl bg-white/95 p-3 pe-4 shadow-[var(--shadow-lift)] backdrop-blur dark:bg-ink-900/95 sm:start-8">
                <div className="flex -space-x-2 rtl:space-x-reverse">
                  {AVATAR_COLORS.map((c, i) => (
                    <span key={i} className={`h-8 w-8 rounded-full ring-2 ring-white dark:ring-ink-900 ${c}`} />
                  ))}
                </div>
                <div>
                  <p className="text-xs font-bold leading-tight">{hero.badgeText}</p>
                  <p className="text-[11px] leading-tight text-muted">يثقون ب{storeInfo.name}</p>
                </div>
              </div>
            )}

            {floating && (
              <Link
                href={`/p/${floating.slug}`}
                className="absolute -bottom-6 end-2 flex items-center gap-3 rounded-2xl bg-white p-3 pe-5 shadow-[var(--shadow-lift)] transition-transform hover:-translate-y-0.5 dark:bg-ink-900 sm:end-6"
              >
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[var(--surface-sunken)]">
                  <Image src={floating.imageUrl} alt={floating.nameAr} fill sizes="56px" className="object-cover" />
                </div>
                <div>
                  <p className="max-w-32 truncate text-xs font-bold">{floating.nameAr}</p>
                  <Rating value={floating.rating} size={11} className="mt-0.5" />
                  <Price value={floating.price} size="sm" className="mt-0.5" />
                </div>
              </Link>
            )}
          </div>
        </div>
      </section>
    ),

    trustBar: () =>
      trustItems.length > 0 && (
        <section className="border-b bg-[var(--surface-raised)]">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px px-4 lg:grid-cols-4">
            {trustItems.map((t) => (
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
      ),

    categories: () =>
      categories.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-14">
          <div>
            {theme.categoriesEyebrow && (
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                {theme.categoriesEyebrow}
              </span>
            )}
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight">{theme.categoriesTitle}</h2>
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
                {c.descAr && <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted">{c.descAr}</p>}
              </Link>
            ))}
          </div>
        </section>
      ),

    featured: () =>
      featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-14">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight">{theme.featuredTitle}</h2>
              {theme.featuredSubtitle && <p className="mt-1.5 text-sm text-muted">{theme.featuredSubtitle}</p>}
            </div>
            {theme.featuredLinkText && (
              <Link href={theme.featuredLinkHref} className="shrink-0 text-sm font-semibold text-brand-700 hover:underline">
                {theme.featuredLinkText}
              </Link>
            )}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {featured.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </section>
      ),

    bundle: () =>
      bundle && (
        <section className="mx-auto max-w-7xl px-4 pb-14">
          <div className="surface-card relative overflow-hidden bg-brand-900 text-white">
            <div aria-hidden className="blob -end-20 -top-20 h-64 w-64 bg-brand-700/60" />
            <div aria-hidden className="blob -start-16 -bottom-16 h-56 w-56 bg-accent-500/30" />
            <div className="relative grid gap-8 p-8 lg:grid-cols-2 lg:items-center lg:p-14">
              <div>
                {theme.bundleBadge && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold ring-1 ring-inset ring-white/20">
                    {theme.bundleBadge}
                  </span>
                )}
                <h2 className="mt-4 text-2xl font-extrabold leading-snug tracking-tight lg:text-3xl">{bundle.nameAr}</h2>
                {(bundle.shortDescAr || bundle.descAr) && (
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-brand-100">{bundle.descAr ?? bundle.shortDescAr}</p>
                )}
                <div className="mt-6 flex items-baseline gap-3">
                  <Price value={bundle.basePrice} compareAt={bundle.comparePrice} size="lg" className="text-white [&_.text-muted]:text-brand-200" />
                </div>
                <Button href={`/p/${bundle.slug}`} variant="accent" size="lg" className="mt-6">
                  {theme.bundleCtaText || "اطلبه الآن"}
                </Button>
              </div>
              <div className="relative mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-[2rem] shadow-[var(--shadow-lift)] lg:max-w-sm">
                <Image src={bundle.images[0]?.url ?? "/products/placeholder.svg"} alt={bundle.nameAr} fill sizes="384px" className="object-cover" />
              </div>
            </div>
          </div>
        </section>
      ),

    testimonials: () =>
      testimonials.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-14">
          <div className="text-center">
            {theme.testimonialsEyebrow && (
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                {theme.testimonialsEyebrow}
              </span>
            )}
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight">{theme.testimonialsTitle}</h2>
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
      ),

    arrivals: () =>
      arrivals.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-14">
          <h2 className="text-2xl font-extrabold tracking-tight">{theme.arrivalsTitle}</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {arrivals.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </section>
      ),

    finalCta: () =>
      theme.finalCtaTitle && (
        <section className="relative overflow-hidden bg-brand-50 py-16 text-center dark:bg-ink-950">
          <div aria-hidden className="blob start-1/2 top-0 h-[120%] w-[140%] -translate-x-1/2 rtl:translate-x-1/2 bg-gradient-to-b from-brand-100 to-transparent dark:from-brand-950/50" />
          <div className="relative mx-auto max-w-2xl px-4">
            <h2 className="text-3xl font-extrabold tracking-tight text-ink-900 dark:text-white sm:text-4xl">{theme.finalCtaTitle}</h2>
            {theme.finalCtaText && <p className="mt-3 text-sm leading-relaxed text-muted">{theme.finalCtaText}</p>}
            {theme.finalCtaButtonText && (
              <Button href={theme.finalCtaButtonHref} variant="accent" size="lg" className="mt-6">
                {theme.finalCtaButtonText}
              </Button>
            )}
          </div>
        </section>
      ),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLd(organizationJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLd(websiteJsonLd) }} />

      {theme.sectionOrder
        .filter((key) => sections[key])
        .map((key) => (
          <Fragment key={key}>{render[key]()}</Fragment>
        ))}
    </>
  );
}
