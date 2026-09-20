import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Price } from "@/components/ui/Price";
import { Rating } from "@/components/ui/Rating";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProductCard } from "@/components/storefront/ProductCard";
import { getProductBySlug, getRelatedProducts } from "@/server/catalog/queries";
import { formatDate } from "@/lib/format";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  return { title: product?.metaTitle ?? product?.nameAr ?? "منتج", description: product?.metaDesc ?? undefined };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const related = await getRelatedProducts(product.categoryId, slug);
  const totalAvailable = product.variants.reduce((s, v) => s + v.available, 0);
  const hasVariants = product.variants.length > 1;

  return (
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
            {totalAvailable > 0 ? (
              <Badge tone="green">متوفر</Badge>
            ) : (
              <Badge tone="gray">نفد المخزون</Badge>
            )}
          </div>

          <div className="mt-5">
            <Price value={product.variants[0]?.price ?? product.basePrice} compareAt={product.variants[0]?.comparePrice ?? product.comparePrice} size="lg" />
            <p className="mt-1 text-xs text-muted">شامل ضريبة القيمة المضافة</p>
          </div>

          {product.shortDescAr && <p className="mt-5 leading-relaxed text-muted">{product.shortDescAr}</p>}

          {hasVariants && (
            <div className="mt-6">
              <h2 className="text-sm font-semibold">الخيار</h2>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {product.variants.map((v, i) => (
                  <button
                    key={v.id}
                    disabled={v.available <= 0}
                    className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      i === 0
                        ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300"
                        : "hover:bg-ink-100 dark:hover:bg-ink-800"
                    }`}
                  >
                    {v.nameAr}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-7 flex items-center gap-3">
            <div className="flex h-12 items-center rounded-xl border">
              <button className="w-11 text-lg text-muted" aria-label="إنقاص الكمية">−</button>
              <span className="num w-8 text-center text-sm font-medium">1</span>
              <button className="w-11 text-lg text-muted" aria-label="زيادة الكمية">+</button>
            </div>
            <Button size="lg" className="flex-1" disabled={totalAvailable <= 0}>
              {totalAvailable > 0 ? "أضف إلى السلة" : "نفد المخزون"}
            </Button>
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
      {product.reviews.length > 0 && (
        <section className="mt-16 border-t pt-10">
          <h2 className="text-xl font-bold">آراء العملاء</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
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
        </section>
      )}

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
  );
}
