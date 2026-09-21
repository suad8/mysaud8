import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Rating } from "@/components/ui/Rating";
import { ProductCard } from "@/components/storefront/ProductCard";
import { ProductPurchasePanel } from "@/components/storefront/ProductPurchasePanel";
import { ReviewForm } from "@/components/storefront/ReviewForm";
import { getProductBySlug, getRelatedProducts } from "@/server/catalog/queries";
import { getStoreInfoSettings } from "@/server/settings";
import { formatDate } from "@/lib/format";
import { toJsonLd } from "@/lib/json-ld";
import { CURRENCY, SITE_URL } from "@/lib/constants";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "منتج" };

  const title = product.metaTitle ?? product.nameAr;
  const description = product.metaDesc ?? product.shortDescAr ?? undefined;
  const image = product.images[0]?.url;

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/p/${slug}` },
    openGraph: { title, description, images: image ? [{ url: image }] : undefined },
  };
}

/** بيانات Product المهيكلة (Schema.org) — أساس ظهور المنتج بنتائج غنية وGoogle Shopping. */
function buildProductJsonLd(
  product: NonNullable<Awaited<ReturnType<typeof getProductBySlug>>>,
  storeName: string,
  totalAvailable: number,
) {
  const variant = product.variants[0];
  const price = variant?.price ?? product.basePrice;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.nameAr,
    description: product.shortDescAr ?? product.descAr ?? undefined,
    image: product.images.map((i) => `${SITE_URL}${i.url}`),
    sku: variant?.sku,
    brand: { "@type": "Brand", name: storeName },
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/p/${product.slug}`,
      priceCurrency: CURRENCY,
      price: price.toFixed(2),
      availability: totalAvailable > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
    ...(product.reviewCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.rating.toFixed(1),
            reviewCount: product.reviewCount,
          },
        }
      : {}),
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const [product, storeInfo] = await Promise.all([getProductBySlug(slug), getStoreInfoSettings()]);
  if (!product) notFound();

  const related = await getRelatedProducts(product.categoryId, slug);
  const totalAvailable = product.variants.reduce((s, v) => s + v.available, 0);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(buildProductJsonLd(product, storeInfo.name, totalAvailable)) }}
      />
      <div className="mx-auto max-w-7xl px-4 py-8">
      <nav className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <Link href="/" className="hover:text-[var(--text-strong)]">الرئيسية</Link>
        <span>/</span>
        {product.category && (
          <>
            <Link href={`/c/${product.category.slug}`} className="hover:text-[var(--text-strong)]">
              {product.category.nameAr}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-[var(--text-strong)]">{product.nameAr}</span>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        {/* المعرض */}
        <div>
          <div className="surface-card relative aspect-square overflow-hidden">
            <Image src={product.images[0]?.url ?? "/products/placeholder.svg"} alt={product.nameAr} fill sizes="50vw" className="object-cover" priority />
          </div>
          {product.images.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-3">
              {product.images.map((img) => (
                <div key={img.id} className="surface-card relative aspect-square overflow-hidden">
                  <Image src={img.url} alt={img.alt ?? product.nameAr} fill sizes="10vw" className="object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* التفاصيل */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{product.nameAr}</h1>
          <div className="mt-3 flex items-center gap-3">
            <Rating value={product.rating} count={product.reviewCount} />
          </div>

          {product.shortDescAr && <p className="mt-5 leading-relaxed text-muted">{product.shortDescAr}</p>}

          <div className="mt-5">
            <ProductPurchasePanel
              variants={product.variants.map((v) => ({
                id: v.id,
                nameAr: v.nameAr,
                price: v.price,
                comparePrice: v.comparePrice,
                available: v.available,
              }))}
            />
          </div>

          <div className="mt-8 grid grid-cols-3 gap-3 border-t pt-6 text-center">
            {[
              ["شحن", "1–3 أيام"],
              ["إرجاع", "خلال 14 يوماً"],
              ["الدفع", "آمن 100%"],
            ].map(([t, d]) => (
              <div key={t}>
                <p className="text-xs font-semibold">{t}</p>
                <p className="mt-0.5 text-[11px] text-muted">{d}</p>
              </div>
            ))}
          </div>

          {product.descAr && (
            <div className="mt-8 border-t pt-6">
              <h2 className="text-sm font-semibold">الوصف</h2>
              <p className="mt-2.5 whitespace-pre-line text-sm leading-relaxed text-muted">{product.descAr}</p>
            </div>
          )}
        </div>
      </div>

      {/* التقييمات */}
      <section className="mt-16 border-t pt-10">
        <h2 className="text-xl font-bold">آراء العملاء</h2>
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {product.reviews.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {product.reviews.map((r) => (
                  <div key={r.id} className="surface-card p-5">
                    <div className="flex items-center justify-between">
                      <Rating value={r.rating} />
                      <span className="text-xs text-muted">{formatDate(r.createdAt)}</span>
                    </div>
                    <p className="mt-3 text-sm font-semibold">{r.authorName}</p>
                    {r.comment && <p className="mt-1.5 text-sm leading-relaxed text-muted">{r.comment}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">لا توجد تقييمات بعد — كن أول من يقيّم هذا المنتج.</p>
            )}
          </div>
          <div>
            <ReviewForm productSlug={product.slug} />
          </div>
        </div>
      </section>

      {/* منتجات مشابهة */}
      {related.length > 0 && (
        <section className="mt-16 border-t pt-10">
          <h2 className="text-xl font-bold">قد يعجبك أيضاً</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </section>
      )}
      </div>
    </>
  );
}
