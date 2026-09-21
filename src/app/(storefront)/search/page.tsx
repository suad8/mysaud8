import type { Metadata } from "next";
import { ProductCard } from "@/components/storefront/ProductCard";
import { searchProducts } from "@/server/catalog/queries";
import { formatNumber } from "@/lib/format";

type Props = { searchParams: Promise<{ q?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q = "" } = await searchParams;
  return { title: q ? `نتائج البحث عن "${q}"` : "البحث" };
}

export default async function SearchPage({ searchParams }: Props) {
  const { q = "" } = await searchParams;
  const products = q ? await searchProducts(q) : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <header className="border-b pb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          {q ? (
            <>
              نتائج البحث عن <span className="text-brand-700">"{q}"</span>
            </>
          ) : (
            "البحث"
          )}
        </h1>
        {q && <p className="num mt-1.5 text-sm text-muted">{formatNumber(products.length)} نتيجة</p>}
      </header>

      {!q ? (
        <p className="mt-12 text-center text-sm text-muted">اكتب كلمة في مربع البحث أعلاه لعرض النتائج.</p>
      ) : products.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-sm text-muted">لا توجد منتجات مطابقة لبحثك.</p>
          <p className="mt-1 text-xs text-muted">جرّب كلمة أخرى أو تصفّح الأقسام من الصفحة الرئيسية.</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
