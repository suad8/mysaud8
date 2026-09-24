import { Topbar } from "@/components/admin/Topbar";
import { Price } from "@/components/ui/Price";
import { db } from "@/server/db";
import { OrderStatus } from "@prisma/client";
import { formatNumber } from "@/lib/format";
import { requireAdminPage } from "@/server/auth/session";

const PAID = [OrderStatus.PAID, OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED];

export default async function AdminReportsPage() {
  await requireAdminPage();
  const items = await db.orderItem.groupBy({
    by: ["nameAr"],
    _sum: { quantity: true, lineTotal: true },
    where: { order: { status: { in: PAID } } },
    orderBy: { _sum: { lineTotal: "desc" } },
    take: 8,
  });

  const byCategory = await db.category.findMany({
    select: {
      nameAr: true,
      products: {
        select: { orderItems: { where: { order: { status: { in: PAID } } }, select: { lineTotal: true } } },
      },
    },
  });

  const categoryTotals = byCategory
    .map((c) => ({
      nameAr: c.nameAr,
      total: c.products.reduce((s, p) => s + p.orderItems.reduce((s2, i) => s2 + Number(i.lineTotal), 0), 0),
    }))
    .sort((a, b) => b.total - a.total);

  const maxCat = Math.max(...categoryTotals.map((c) => c.total), 1);
  const maxItem = Math.max(...items.map((i) => Number(i._sum.lineTotal ?? 0)), 1);

  return (
    <>
      <Topbar title="التقارير" subtitle="أفضل المنتجات والتصنيفات مبيعاً" />
      <div className="grid gap-6 p-5 lg:grid-cols-2 lg:p-8">
        <section className="surface-card p-5">
          <h2 className="text-sm font-semibold">الأكثر مبيعاً</h2>
          <ul className="mt-5 space-y-4">
            {items.map((item) => (
              <li key={item.nameAr}>
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate font-medium">{item.nameAr}</span>
                  <Price value={Number(item._sum.lineTotal ?? 0)} size="sm" />
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-[var(--surface-sunken)]">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{ width: `${(Number(item._sum.lineTotal ?? 0) / maxItem) * 100}%` }}
                  />
                </div>
                <p className="num mt-1 text-xs text-muted">{formatNumber(item._sum.quantity ?? 0)} قطعة مباعة</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="surface-card p-5">
          <h2 className="text-sm font-semibold">المبيعات حسب التصنيف</h2>
          <ul className="mt-5 space-y-4">
            {categoryTotals.map((c) => (
              <li key={c.nameAr}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{c.nameAr}</span>
                  <Price value={c.total} size="sm" />
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-[var(--surface-sunken)]">
                  <div className="h-full rounded-full bg-accent-500" style={{ width: `${(c.total / maxCat) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
