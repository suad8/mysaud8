import Image from "next/image";
import Link from "next/link";
import { Topbar } from "@/components/admin/Topbar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Price } from "@/components/ui/Price";
import { db } from "@/server/db";
import { PRODUCT_STATUS } from "@/lib/constants";
import { formatNumber } from "@/lib/format";

export default async function AdminProductsPage() {
  const products = await db.product.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      images: { take: 1, orderBy: { position: "asc" } },
      category: { select: { nameAr: true } },
      variants: { include: { inventory: true } },
    },
  });

  return (
    <>
      <Topbar
        title="المنتجات"
        subtitle={`${formatNumber(products.length)} منتج في الكتالوج`}
        actions={<Button size="sm">+ منتج جديد</Button>}
      />

      <div className="p-5 lg:p-8">
        <div className="surface-card overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 border-b p-4">
            <input
              placeholder="ابحث بالاسم أو SKU…"
              className="h-10 flex-1 min-w-48 rounded-lg border bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-brand-500/40"
            />
            <select className="h-10 rounded-lg border bg-transparent px-3 text-sm outline-none">
              <option>كل الحالات</option>
              <option>منشور</option>
              <option>مسودة</option>
              <option>مؤرشف</option>
            </select>
          </div>

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
                        <div className="flex items-center gap-3">
                          <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-[var(--surface-sunken)]">
                            <Image src={p.images[0]?.url ?? "/products/box.svg"} alt="" fill sizes="44px" className="object-cover" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{p.nameAr}</p>
                            <p className="text-xs text-muted">{p.variants.length} متغيّر</p>
                          </div>
                        </div>
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
        </div>
      </div>
    </>
  );
}
