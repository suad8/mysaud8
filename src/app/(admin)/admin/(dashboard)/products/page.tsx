import Image from "next/image";
import Link from "next/link";
import { Topbar } from "@/components/admin/Topbar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Price } from "@/components/ui/Price";
import { db } from "@/server/db";
import { PRODUCT_STATUS } from "@/lib/constants";
import { formatNumber } from "@/lib/format";
import type { Prisma, ProductStatus } from "@prisma/client";
import { requireAdminPage } from "@/server/auth/session";

type Props = { searchParams: Promise<{ q?: string; status?: string }> };

const STATUS_OPTIONS: { value: ProductStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "كل الحالات" },
  { value: "ACTIVE", label: "منشور" },
  { value: "DRAFT", label: "مسودة" },
  { value: "ARCHIVED", label: "مؤرشف" },
];

export default async function AdminProductsPage({ searchParams }: Props) {
  await requireAdminPage();
  const { q = "", status = "ALL" } = await searchParams;

  const where: Prisma.ProductWhereInput = {
    deletedAt: null,
    ...(status !== "ALL" ? { status: status as ProductStatus } : {}),
    ...(q.trim()
      ? {
          OR: [
            { nameAr: { contains: q.trim(), mode: "insensitive" } },
            { variants: { some: { sku: { contains: q.trim(), mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  const [products, totalCount] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        images: { take: 1, orderBy: { position: "asc" } },
        category: { select: { nameAr: true } },
        variants: { include: { inventory: true } },
      },
    }),
    db.product.count({ where: { deletedAt: null } }),
  ]);

  const isFiltered = Boolean(q.trim()) || status !== "ALL";

  return (
    <>
      <Topbar
        title="المنتجات"
        subtitle={`${formatNumber(totalCount)} منتج في الكتالوج`}
        actions={<Button href="/admin/products/new" size="sm">+ منتج جديد</Button>}
      />

      <div className="p-5 lg:p-8">
        <div className="surface-card overflow-hidden">
          <form method="GET" className="flex flex-wrap items-center gap-3 border-b p-4">
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="ابحث بالاسم أو SKU…"
              className="h-10 flex-1 min-w-48 rounded-lg border bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-brand-500/40"
            />
            <select name="status" defaultValue={status} className="h-10 rounded-lg border bg-transparent px-3 text-sm outline-none">
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <Button type="submit" variant="secondary" size="sm">تصفية</Button>
            {isFiltered && (
              <Link href="/admin/products" className="text-xs font-medium text-muted hover:text-brand-700">
                مسح الفلاتر
              </Link>
            )}
          </form>

          {products.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 dark:bg-brand-950">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7 stroke-brand-600 dark:stroke-brand-400">
                  <path d="M20 7L10 2 0 7v10l10 5 10-5zM10 12L0 7m10 5v10m0-10l10-5" />
                </svg>
              </span>
              {isFiltered ? (
                <>
                  <p className="text-sm font-semibold">لا توجد منتجات مطابقة</p>
                  <p className="text-xs text-muted">جرّب تغيير كلمة البحث أو الفلتر.</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold">لا توجد منتجات بعد</p>
                  <p className="max-w-xs text-xs text-muted">ابدأ ببناء كتالوجك بإضافة أول منتج — الاسم والسعر وصورة واحدة تكفي للبدء.</p>
                  <Button href="/admin/products/new" size="sm" className="mt-2">+ أضف أول منتج</Button>
                </>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-start text-xs text-muted">
                    <th className="px-5 py-3 text-start font-medium">المنتج</th>
                    <th className="px-5 py-3 text-start font-medium">التصنيف</th>
                    <th className="px-5 py-3 text-start font-medium">السعر</th>
                    <th className="px-5 py-3 text-start font-medium">المخزون</th>
                    <th className="px-5 py-3 text-start font-medium">الحالة</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => {
                    const meta = PRODUCT_STATUS[p.status];
                    const stock = p.variants.reduce((s, v) => s + Math.max(0, (v.inventory?.onHand ?? 0) - (v.inventory?.reserved ?? 0)), 0);
                    return (
                      <tr key={p.id} className="border-t transition-colors hover:bg-ink-50 dark:hover:bg-ink-800/40">
                        <td className="px-5 py-3">
                          <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3">
                            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-[var(--surface-sunken)]">
                              <Image src={p.images[0]?.url ?? "/products/placeholder.svg"} alt="" fill sizes="44px" className="object-cover" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate font-medium">{p.nameAr}</p>
                              <p className="text-xs text-muted">{p.variants.length} متغيّر</p>
                            </div>
                          </Link>
                        </td>
                        <td className="px-5 py-3 text-muted">{p.category?.nameAr ?? "—"}</td>
                        <td className="px-5 py-3"><Price value={p.basePrice.toString()} size="sm" /></td>
                        <td className="px-5 py-3">
                          <Badge tone={stock === 0 ? "gray" : stock <= 5 ? "amber" : "green"}>
                            {stock === 0 ? "نفد" : `${formatNumber(stock)} قطعة`}
                          </Badge>
                        </td>
                        <td className="px-5 py-3"><Badge tone={meta.tone}>{meta.label}</Badge></td>
                        <td className="px-5 py-3 text-end">
                          <Link href={`/admin/products/${p.id}`} className="text-xs font-medium text-brand-700 hover:underline">
                            تعديل
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
