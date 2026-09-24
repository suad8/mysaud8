import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ProductCard } from "@/components/storefront/ProductCard";
import { getProductsByCategory } from "@/server/catalog/queries";
import { formatNumber } from "@/lib/format";
import { decodeSlug } from "@/lib/route-params";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string }>;
};

const SORTS = [
  { key: "newest", label: "الأحدث" },
  { key: "price-asc", label: "الأقل سعراً" },
  { key: "price-desc", label: "الأعلى سعراً" },
];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = decodeSlug((await params).slug);
  const { category } = await getProductsByCategory(slug);
  return { title: category?.nameAr ?? "التصنيف" };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const slug = decodeSlug((await params).slug);
  const { sort = "newest" } = await searchParams;
  const { category, products } = await getProductsByCategory(slug, { sort });

  if (!category) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <nav className="flex items-center gap-2 text-xs text-muted">
        <Link href="/" className="hover:text-[var(--text-strong)]">الرئيسية</Link>
        <span>/</span>
        <span className="text-[var(--text-strong)]">{category.nameAr}</span>
      </nav>

      <header className="mt-4 border-b pb-6">
        <h1 className="text-3xl font-bold tracking-tight">{category.nameAr}</h1>
        {category.descAr && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{category.descAr}</p>}
      </header>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        {/* الفلاتر — هيكل التصميم، يُربط بالمنطق في المرحلة ٣ */}
        <aside className="lg:w-60 lg:shrink-0">
          <div className="surface-card p-5">
            <h2 className="text-sm font-semibold">السعر</h2>
            <div className="mt-3 flex items-center gap-2">
              <input placeholder="من" className="num h-9 w-full rounded-lg border bg-transparent px-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500/40" />
              <span className="text-muted">—</span>
              <input placeholder="إلى" className="num h-9 w-full rounded-lg border bg-transparent px-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500/40" />
            </div>

            <h2 className="mt-6 text-sm font-semibold">التوفر</h2>
            <div className="mt-3 space-y-2.5">
              {["متوفر الآن", "عليه تخفيض"].map((label) => (
                <label key={label} className="flex cursor-pointer items-center gap-2.5 text-sm text-muted">
                  <input type="checkbox" className="h-4 w-4 rounded border-ink-300 accent-brand-600" />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </aside>

        <div className="flex-1">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="num text-sm text-muted">{formatNumber(products.length)} منتج</p>
            <div className="flex gap-1.5">
              {SORTS.map((s) => (
                <Link
                  key={s.key}
                  href={`/c/${slug}?sort=${s.key}`}
                  className={`rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors ${
                    sort === s.key
                      ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300"
                      : "text-muted hover:bg-ink-100 dark:hover:bg-ink-800"
                  }`}
                >
                  {s.label}
                </Link>
              ))}
            </div>
          </div>

          {products.length === 0 ? (
            <p className="mt-12 text-center text-sm text-muted">لا توجد منتجات في هذا التصنيف حالياً.</p>
          ) : (
            <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-3">
              {products.map((p) => (
                <ProductCard key={p.slug} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
