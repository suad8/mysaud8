import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Price } from "@/components/ui/Price";
import { Rating } from "@/components/ui/Rating";
import { ProductCard, type ProductCardData } from "@/components/storefront/ProductCard";
import { HomeSlider } from "@/components/storefront/home/HomeSlider";
import { Countdown } from "@/components/storefront/home/Countdown";
import {
  getActiveProductCount,
  getCategories,
  getCategoryProductCards,
  getFeaturedProducts,
  getNewArrivals,
  getProductBySlug,
  getProductCardBySlug,
  getProductCardsByIds,
  getPromoProduct,
  getSaleProducts,
  getTestimonials,
} from "@/server/catalog/queries";
import { getHeroContent, getStoreInfoSettings } from "@/server/settings";
import { formatNumber } from "@/lib/format";
import { HERO_PRODUCT_HIDDEN } from "@/lib/theme";
import { countdownTarget, FEATURE_ICONS, youtubeId, type AnyHomeBlock, type BlockData } from "@/lib/home-blocks";

type Ctx = { featuredOrder: string[]; first: boolean };

const AVATAR_COLORS = ["bg-brand-500", "bg-accent-500", "bg-brand-300"];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
      {children}
    </span>
  );
}

/** يعرض قسماً واحداً من أقسام «تصميم الرئيسية» — كل قسم يجلب بياناته بنفسه بالتوازي مع البقية. */
export function HomeBlockView({ block, ctx }: { block: AnyHomeBlock; ctx: Ctx }) {
  switch (block.type) {
    case "hero":
      return <HeroBlock featuredOrder={ctx.featuredOrder} />;
    case "slider":
      return <SliderBlock data={block.data} priority={ctx.first} />;
    case "banner":
      return <BannerBlock data={block.data} priority={ctx.first} />;
    case "squares":
      return <SquaresBlock data={block.data} />;
    case "products":
      return <ProductsBlock data={block.data} featuredOrder={ctx.featuredOrder} />;
    case "categories":
      return <CategoriesBlock data={block.data} />;
    case "features":
      return <FeaturesBlock data={block.data} />;
    case "testimonials":
      return <TestimonialsBlock data={block.data} />;
    case "text":
      return <TextBlock data={block.data} />;
    case "video":
      return <VideoBlock data={block.data} />;
    case "brands":
      return <BrandsBlock data={block.data} />;
    case "countdown":
      return <CountdownBlock data={block.data} />;
    case "cta":
      return <CtaBlock data={block.data} />;
    case "bundle":
      return <BundleBlock data={block.data} />;
  }
}

// ── البانر الرئيسي ────────────────────────────────────────────
type CardDisplay = { slug: string; nameAr: string; imageUrl: string; price: number; rating: number };
const cardToDisplay = (p: ProductCardData): CardDisplay => ({ slug: p.slug, nameAr: p.nameAr, imageUrl: p.imageUrl, price: p.price, rating: p.rating });

async function HeroBlock({ featuredOrder }: { featuredOrder: string[] }) {
  const [hero, storeInfo] = await Promise.all([getHeroContent(), getStoreInfoSettings()]);
  const [featured, arrivals, productCount, chosenFloating] = await Promise.all([
    getFeaturedProducts(2, featuredOrder),
    getNewArrivals(2),
    getActiveProductCount(),
    hero.floatingProductSlug && hero.floatingProductSlug !== HERO_PRODUCT_HIDDEN ? getProductCardBySlug(hero.floatingProductSlug) : Promise.resolve(null),
  ]);

  // صورة البانر: مخصّصة إن وُجدت، وإلا صورة أول منتج بارز/حديث
  const pool = [...featured, ...arrivals];
  const autoHero: CardDisplay | null = pool[0] ? cardToDisplay(pool[0]) : null;
  const autoSecond = pool.find((p) => p.slug !== autoHero?.slug);
  const floating: CardDisplay | null =
    hero.floatingProductSlug === HERO_PRODUCT_HIDDEN ? null : chosenFloating ? cardToDisplay(chosenFloating) : autoSecond ? cardToDisplay(autoSecond) : null;
  // بلا صورة بانر ولا منتجات بعد: شعار المتجر نفسه كصورة البانر بدل مساحة فارغة
  const heroIsLogo = !hero.imageUrl && !autoHero && Boolean(storeInfo.logoUrl);
  const heroImageUrl = hero.imageUrl || autoHero?.imageUrl || (heroIsLogo ? storeInfo.logoUrl : undefined);
  const heroImageAlt = hero.imageUrl ? hero.headline : heroIsLogo ? storeInfo.name : (autoHero?.nameAr ?? "");

  const stats = [
    hero.stat1Value ? { value: hero.stat1Value, label: hero.stat1Label } : null,
    hero.stat2Value ? { value: hero.stat2Value, label: hero.stat2Label } : null,
    productCount > 0 ? { value: formatNumber(productCount), label: "منتج مختار" } : null,
  ].filter((s): s is { value: string; label: string } => s !== null);

  return (
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
              <Image src={heroImageUrl} alt={heroImageAlt} fill sizes="(max-width: 1024px) 90vw, 45vw" className={heroIsLogo ? "object-contain p-[18%]" : "object-cover"} priority />
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
  );
}

// ── سلايدر / بانر / صور مربعة / شعارات ─────────────────────────
function SliderBlock({ data, priority }: { data: BlockData["slider"]; priority: boolean }) {
  const slides = data.slides.filter((s) => s.imageUrl || s.title);
  if (slides.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <HomeSlider slides={slides} autoplay={data.autoplay} priority={priority} />
    </section>
  );
}

function BannerBlock({ data, priority }: { data: BlockData["banner"]; priority: boolean }) {
  if (!data.imageUrl && !data.title) return null;
  const hasText = Boolean(data.title || data.subtitle || data.buttonText);
  const inner = (
    <div className={`relative overflow-hidden rounded-[var(--radius-card)] ${data.imageUrl ? "aspect-[16/9] sm:aspect-[4/1]" : "bg-gradient-to-l from-brand-700 to-brand-900 py-12"}`}>
      {data.imageUrl && <Image src={data.imageUrl} alt={data.title} fill sizes="(max-width: 1280px) 100vw, 1280px" className="object-cover" priority={priority} />}
      {hasText && (
        <div className={`${data.imageUrl ? "absolute inset-0 bg-gradient-to-l from-black/60 via-black/25 to-transparent" : "relative"} flex items-center p-6 sm:p-10`}>
          <div className="max-w-md text-white">
            {data.title && <h2 className="text-xl font-extrabold leading-snug sm:text-3xl">{data.title}</h2>}
            {data.subtitle && <p className="mt-2 text-sm text-white/85">{data.subtitle}</p>}
            {data.buttonText && (
              <span className="mt-4 inline-flex h-10 items-center rounded-full bg-accent-500 px-5 text-sm font-semibold text-on-accent">{data.buttonText}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
  return (
    <section className="mx-auto max-w-7xl px-4 py-6">
      {data.href ? (
        <Link href={data.href} className="block transition-opacity hover:opacity-95" aria-label={data.title || undefined}>
          {inner}
        </Link>
      ) : (
        inner
      )}
    </section>
  );
}

const SQUARE_GRID: Record<number, string> = { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-2 sm:grid-cols-3", 4: "grid-cols-2 lg:grid-cols-4" };

function SquaresBlock({ data }: { data: BlockData["squares"] }) {
  const items = data.items.filter((i) => i.imageUrl);
  if (items.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      {data.title && <h2 className="mb-5 text-2xl font-extrabold tracking-tight">{data.title}</h2>}
      <div className={`grid gap-4 ${SQUARE_GRID[items.length] ?? SQUARE_GRID[4]}`}>
        {items.map((it, i) => {
          const card = (
            <div className="group relative aspect-square overflow-hidden rounded-[var(--radius-card)] bg-[var(--surface-sunken)]">
              <Image src={it.imageUrl} alt={it.title} fill sizes="(max-width: 1024px) 50vw, 25vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
              {it.title && (
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 pt-10 text-sm font-bold text-white sm:text-base">{it.title}</span>
              )}
            </div>
          );
          return it.href ? (
            <Link key={i} href={it.href}>
              {card}
            </Link>
          ) : (
            <div key={i}>{card}</div>
          );
        })}
      </div>
    </section>
  );
}

function BrandsBlock({ data }: { data: BlockData["brands"] }) {
  const items = data.items.filter((i) => i.imageUrl);
  if (items.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      {data.title && <h2 className="mb-6 text-center text-xl font-extrabold tracking-tight">{data.title}</h2>}
      <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
        {items.map((it, i) => {
          const logo = (
            <span className="relative block h-16 w-32 opacity-70 grayscale transition hover:opacity-100 hover:grayscale-0">
              <Image src={it.imageUrl} alt={it.title} fill sizes="128px" className="object-contain" />
            </span>
          );
          return it.href ? (
            <Link key={i} href={it.href} aria-label={it.title || undefined}>
              {logo}
            </Link>
          ) : (
            <span key={i}>{logo}</span>
          );
        })}
      </div>
    </section>
  );
}

// ── المنتجات والتصنيفات والتقييمات ────────────────────────────
function loadProducts(data: BlockData["products"], featuredOrder: string[]): Promise<ProductCardData[]> {
  switch (data.source) {
    case "featured":
      return getFeaturedProducts(data.count, featuredOrder);
    case "sale":
      return getSaleProducts(data.count);
    case "category":
      return data.categorySlug ? getCategoryProductCards(data.categorySlug, data.count) : Promise.resolve([]);
    case "manual":
      return getProductCardsByIds(data.productIds.slice(0, data.count));
    default:
      return getNewArrivals(data.count);
  }
}

async function ProductsBlock({ data, featuredOrder }: { data: BlockData["products"]; featuredOrder: string[] }) {
  const products = await loadProducts(data, featuredOrder);
  if (products.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 py-7">
      <div className="flex items-end justify-between gap-4">
        <div>
          {data.title && <h2 className="text-2xl font-extrabold tracking-tight">{data.title}</h2>}
          {data.subtitle && <p className="mt-1.5 text-sm text-muted">{data.subtitle}</p>}
        </div>
        {data.linkText && (
          <Link href={data.linkHref} className="shrink-0 text-sm font-semibold text-brand-700 hover:underline">
            {data.linkText}
          </Link>
        )}
      </div>
      {data.layout === "slider" ? (
        <div className="scroll-x -mx-4 mt-6 flex gap-4 px-4 pb-2">
          {products.map((p) => (
            <div key={p.slug} className="w-[46%] shrink-0 sm:w-[31%] lg:w-[23%]">
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      )}
    </section>
  );
}

async function CategoriesBlock({ data }: { data: BlockData["categories"] }) {
  const categories = await getCategories();
  if (categories.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div>
        {data.eyebrow && <Eyebrow>{data.eyebrow}</Eyebrow>}
        {data.title && <h2 className="mt-3 text-2xl font-extrabold tracking-tight">{data.title}</h2>}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {categories.map((c) => (
          <Link key={c.slug} href={`/c/${c.slug}`} className="surface-card group flex flex-col gap-1 p-5 transition-all hover:border-brand-300 hover:shadow-[var(--shadow-soft)]">
            <span className="text-sm font-semibold transition-colors group-hover:text-brand-700">{c.nameAr}</span>
            <span className="num text-xs text-muted">{formatNumber(c._count.products)} منتج</span>
            {c.descAr && <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted">{c.descAr}</p>}
          </Link>
        ))}
      </div>
    </section>
  );
}

async function TestimonialsBlock({ data }: { data: BlockData["testimonials"] }) {
  const testimonials = await getTestimonials(data.count);
  if (testimonials.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="text-center">
        {data.eyebrow && <Eyebrow>{data.eyebrow}</Eyebrow>}
        {data.title && <h2 className="mt-3 text-2xl font-extrabold tracking-tight">{data.title}</h2>}
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
  );
}

async function BundleBlock({ data }: { data: BlockData["bundle"] }) {
  // المنتج المختار قد يُلغى نشره لاحقاً — نرجع للاختيار التلقائي (أحدث منتج عليه خصم)
  const chosen = data.productSlug ? await getProductBySlug(data.productSlug) : null;
  const bundle = chosen ?? (await getPromoProduct());
  if (!bundle) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 py-7">
      <div className="surface-card relative overflow-hidden bg-brand-900 text-white">
        <div aria-hidden className="blob -end-20 -top-20 h-64 w-64 bg-brand-700/60" />
        <div aria-hidden className="blob -start-16 -bottom-16 h-56 w-56 bg-accent-500/30" />
        <div className="relative grid gap-8 p-8 lg:grid-cols-2 lg:items-center lg:p-14">
          <div>
            {data.badge && (
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold ring-1 ring-inset ring-white/20">{data.badge}</span>
            )}
            <h2 className="mt-4 text-2xl font-extrabold leading-snug tracking-tight lg:text-3xl">{bundle.nameAr}</h2>
            {(bundle.shortDescAr || bundle.descAr) && <p className="mt-3 max-w-md text-sm leading-relaxed text-brand-100">{bundle.descAr ?? bundle.shortDescAr}</p>}
            <div className="mt-6 flex items-baseline gap-3">
              <Price value={bundle.basePrice} compareAt={bundle.comparePrice} size="lg" className="text-white [&_.text-muted]:text-brand-200" />
            </div>
            <Button href={`/p/${bundle.slug}`} variant="accent" size="lg" className="mt-6">
              {data.ctaText || "اطلبه الآن"}
            </Button>
          </div>
          <div className="relative mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-[2rem] shadow-[var(--shadow-lift)] lg:max-w-sm">
            <Image src={bundle.images[0]?.url ?? "/products/placeholder.svg"} alt={bundle.nameAr} fill sizes="384px" className="object-cover" />
          </div>
        </div>
      </div>
    </section>
  );
}

// ── أقسام نصية ────────────────────────────────────────────────
const FEATURE_GRID: Record<number, string> = { 1: "lg:grid-cols-1", 2: "lg:grid-cols-2", 3: "lg:grid-cols-3", 4: "lg:grid-cols-4" };

function FeaturesBlock({ data }: { data: BlockData["features"] }) {
  const items = data.items.filter((t) => t.title);
  if (items.length === 0) return null;
  return (
    <section className="border-y bg-[var(--surface-raised)]">
      <div className={`mx-auto grid max-w-7xl grid-cols-2 gap-x-4 px-4 ${FEATURE_GRID[Math.min(items.length, 4)]}`}>
        {items.map((t, i) => (
          <div key={i} className="flex items-center gap-3 py-5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-50 dark:bg-brand-950">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 stroke-brand-600 dark:stroke-brand-400">
                <path d={FEATURE_ICONS[t.icon]} />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{t.title}</p>
              {t.desc && <p className="truncate text-xs text-muted">{t.desc}</p>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function TextBlock({ data }: { data: BlockData["text"] }) {
  if (!data.title && !data.body) return null;
  const center = data.align === "center";
  return (
    <section className={`mx-auto max-w-3xl px-4 py-10 ${center ? "text-center" : ""}`}>
      {data.title && <h2 className="text-2xl font-extrabold tracking-tight">{data.title}</h2>}
      {data.body && <p className="mt-3 whitespace-pre-line text-sm leading-loose text-muted sm:text-base">{data.body}</p>}
      {data.buttonText && data.href && (
        <Button href={data.href} className="mt-6">
          {data.buttonText}
        </Button>
      )}
    </section>
  );
}

function VideoBlock({ data }: { data: BlockData["video"] }) {
  const id = youtubeId(data.youtubeUrl);
  if (!id) return null;
  return (
    <section className="mx-auto max-w-4xl px-4 py-10">
      {data.title && <h2 className="mb-5 text-center text-2xl font-extrabold tracking-tight">{data.title}</h2>}
      <div className="relative aspect-video overflow-hidden rounded-[var(--radius-card)] bg-ink-900 shadow-[var(--shadow-soft)]">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?rel=0`}
          title={data.title || "فيديو"}
          loading="lazy"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 h-full w-full"
        />
      </div>
    </section>
  );
}

function CountdownBlock({ data }: { data: BlockData["countdown"] }) {
  const target = countdownTarget(data.endsAt);
  // العرض المنتهي يختفي تلقائياً من الصفحة
  if (!Number.isFinite(target) || target <= Date.now()) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 py-7">
      <div className="relative overflow-hidden rounded-[var(--radius-card)] bg-gradient-to-l from-brand-700 to-brand-950 p-8 text-white sm:p-12">
        <div aria-hidden className="blob -end-16 -top-16 h-56 w-56 bg-accent-500/25" />
        <div className="relative flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            {data.title && <h2 className="text-2xl font-extrabold leading-snug sm:text-3xl">{data.title}</h2>}
            {data.subtitle && <p className="mt-2 text-sm text-white/80">{data.subtitle}</p>}
            {data.buttonText && data.href && (
              <Button href={data.href} variant="accent" className="mt-5">
                {data.buttonText}
              </Button>
            )}
          </div>
          <Countdown target={target} />
        </div>
      </div>
    </section>
  );
}

function CtaBlock({ data }: { data: BlockData["cta"] }) {
  if (!data.title) return null;
  return (
    <section className="relative overflow-hidden bg-brand-50 py-16 text-center dark:bg-ink-950">
      <div aria-hidden className="blob start-1/2 top-0 h-[120%] w-[140%] -translate-x-1/2 bg-gradient-to-b from-brand-100 to-transparent rtl:translate-x-1/2 dark:from-brand-950/50" />
      <div className="relative mx-auto max-w-2xl px-4">
        <h2 className="text-3xl font-extrabold tracking-tight text-ink-900 dark:text-white sm:text-4xl">{data.title}</h2>
        {data.text && <p className="mt-3 text-sm leading-relaxed text-muted">{data.text}</p>}
        {data.buttonText && (
          <Button href={data.href} variant="accent" size="lg" className="mt-6">
            {data.buttonText}
          </Button>
        )}
      </div>
    </section>
  );
}
