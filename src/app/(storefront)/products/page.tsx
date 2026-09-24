import Link from "next/link";
import type { Metadata } from "next";
import { ProductCard } from "@/components/storefront/ProductCard";
import { getAllProducts } from "@/server/catalog/queries";
import { formatNumber } from "@/lib/format";

export const metadata: Metadata = { title: "كل المنتجات" };

type Props = { searchParams: Promise<{ sort?: string; page?: string }> };

const SORTS = [
  { key: "newest", label: "الأحدث" },
  { key: "price-asc", label: "الأقل سعراً" },
  { key: "price-desc", label: "الأعلى سعراً" },
];

export default async function AllProductsPage({ searchParams }: Props) {
  const { sort = "newest", page: pageRaw } = await searchParams;
  const { products, total, page, pageCount } = await getAllProducts({ sort, page: Number(pageRaw) || 1 });

  const pageHref = (p: number) => `/products?sort=${sort}&page=${p}`;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">كل المنتجات</h1>
          <p className="num mt-1.5 text-sm text-muted">{formatNumber(total)} منتج</p>
        </div>
        <div className="flex gap-1.5">
          {SORTS.map((s) => (
            <Link
              key={s.key}
              href={`/products?sort=${s.key}`}
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
      </header>

      {products.length === 0 ? (
        <p className="mt-12 text-center text-sm text-muted">لا توجد منتجات منشورة بعد.</p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      )}

      {pageCount > 1 && (
        <nav className="mt-10 flex items-center justify-center gap-2 text-sm">
          {page > 1 && (
            <Link href={pageHref(page - 1)} className="rounded-lg border px-3 py-1.5 hover:bg-ink-100 dark:hover:bg-ink-800">
              السابق
            </Link>
          )}
          <span className="num px-2 text-muted">
            {page} / {pageCount}
          </span>
          {page < pageCount && (
            <Link href={pageHref(page + 1)} className="rounded-lg border px-3 py-1.5 hover:bg-ink-100 dark:hover:bg-ink-800">
              التالي
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
