import Link from "next/link";
import { Topbar } from "@/components/admin/Topbar";
import { Badge } from "@/components/ui/Badge";
import { Price } from "@/components/ui/Price";
import { db } from "@/server/db";
import { ORDER_STATUS, type OrderStatusKey } from "@/lib/constants";
import { formatDateTime, formatNumber } from "@/lib/format";

const FILTERS: { key: OrderStatusKey | "ALL"; label: string }[] = [
  { key: "ALL", label: "الكل" },
  { key: "PENDING", label: "بانتظار الدفع" },
  { key: "PAID", label: "مدفوع" },
  { key: "PROCESSING", label: "قيد التجهيز" },
  { key: "SHIPPED", label: "تم الشحن" },
  { key: "DELIVERED", label: "تم التسليم" },
];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const where = status && status !== "ALL" ? { status: status as OrderStatusKey } : {};

  const orders = await db.order.findMany({
    where,
    orderBy: { placedAt: "desc" },
    take: 50,
    include: { customer: { select: { name: true } }, items: { select: { id: true } } },
  });

  return (
    <>
      <Topbar title="الطلبات" subtitle={`${formatNumber(orders.length)} طلب`} />

      <div className="p-5 lg:p-8">
        <div className="scroll-x flex gap-2 pb-4">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={f.key === "ALL" ? "/admin/orders" : `/admin/orders?status=${f.key}`}
              className={`shrink-0 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors ${
                (status ?? "ALL") === f.key
                  ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300"
                  : "text-muted hover:bg-ink-100 dark:hover:bg-ink-800"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>

        <div className="surface-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted">
                  <th className="px-5 py-3 text-start font-medium">رقم الطلب</th>
                  <th className="px-5 py-3 text-start font-medium">العميل</th>
                  <th className="px-5 py-3 text-start font-medium">المنتجات</th>
                  <th className="px-5 py-3 text-start font-medium">الإجمالي</th>
                  <th className="px-5 py-3 text-start font-medium">الحالة</th>
                  <th className="px-5 py-3 text-start font-medium">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const meta = ORDER_STATUS[o.status as OrderStatusKey];
                  return (
                    <tr key={o.id} className="border-t transition-colors hover:bg-ink-50 dark:hover:bg-ink-800/40">
                      <td className="px-5 py-3">
                        <Link href={`/admin/orders/${o.id}`} className="num font-medium text-brand-700 hover:underline">
                          {o.number}
                        </Link>
                      </td>
                      <td className="px-5 py-3">{o.customer?.name ?? o.shipToName}</td>
                      <td className="num px-5 py-3 text-muted">{o.items.length} قطعة</td>
                      <td className="px-5 py-3"><Price value={o.grandTotal.toString()} size="sm" /></td>
                      <td className="px-5 py-3"><Badge tone={meta.tone}>{meta.label}</Badge></td>
                      <td className="px-5 py-3 text-xs text-muted">{formatDateTime(o.placedAt)}</td>
                    </tr>
                  );
                })}
                {orders.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-10 text-center text-sm text-muted">لا توجد طلبات مطابقة</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
