import Link from "next/link";
import { Topbar } from "@/components/admin/Topbar";
import { StatCard } from "@/components/admin/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Price } from "@/components/ui/Price";
import { getDashboardStats } from "@/server/reports/dashboard";
import { ORDER_STATUS, type OrderStatusKey } from "@/lib/constants";
import { formatNumber, formatRelative } from "@/lib/format";
import { requireAdminPage } from "@/server/auth/session";

function SalesChart({ data }: { data: { date: string; total: number }[] }) {
  const max = Math.max(...data.map((d) => d.total), 1);
  return (
    <div className="flex gap-1.5">
      {data.map((d) => (
        <div key={d.date} className="group relative flex flex-1 flex-col items-center gap-1.5">
          {/* مسار بارتفاع ثابت — الارتفاع النسبي للعمود لا يُحسب بدون أب محدَّد الارتفاع */}
          <div className="relative flex h-32 w-full items-end">
            <div className="pointer-events-none absolute -top-9 start-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink-900 px-2 py-1 text-[11px] text-white group-hover:block dark:bg-ink-100 dark:text-ink-900">
              <Price value={d.total} size="sm" />
            </div>
            <div
              className="w-full rounded-md bg-brand-200 transition-colors group-hover:bg-brand-500 dark:bg-brand-900 dark:group-hover:bg-brand-500"
              style={{ height: `${Math.max(4, (d.total / max) * 100)}%` }}
            />
          </div>
          <span className="num text-[10px] text-muted">{d.date}</span>
        </div>
      ))}
    </div>
  );
}

export default async function AdminDashboard() {
  await requireAdminPage();
  const stats = await getDashboardStats();

  return (
    <>
      <Topbar title="نظرة عامة" subtitle="أداء المتجر خلال آخر 30 يوماً" />

      <div className="space-y-6 p-5 lg:p-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="المبيعات (30 يوم)"
            value={`${formatNumber(Math.round(stats.revenue30d))} ر.س`}
            delta={`${stats.revenueDelta >= 0 ? "+" : ""}${stats.revenueDelta.toFixed(1)}%`}
            tone={stats.revenueDelta >= 0 ? "up" : "down"}
            icon="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"
          />
          <StatCard
            label="الطلبات (30 يوم)"
            value={formatNumber(stats.ordersCount30d)}
            delta={`${stats.ordersDelta >= 0 ? "+" : ""}${stats.ordersDelta.toFixed(1)}%`}
            tone={stats.ordersDelta >= 0 ? "up" : "down"}
            icon="M4 6h16l-1.4 10.3a2 2 0 0 1-2 1.7H7.4a2 2 0 0 1-2-1.7ZM9 10V6a3 3 0 0 1 6 0v4"
          />
          <StatCard
            label="متوسط قيمة الطلب"
            value={`${formatNumber(Math.round(stats.aov30d))} ر.س`}
            icon="M3 12h18M3 6h18M3 18h18"
          />
          <StatCard
            label="بانتظار الدفع"
            value={formatNumber(stats.pendingCount)}
            icon="M12 8v4l3 3M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="surface-card p-5 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">المبيعات — آخر 14 يوماً</h2>
              <span className="text-xs text-muted">بالريال السعودي</span>
            </div>
            <div className="mt-6">
              <SalesChart data={stats.salesByDay} />
            </div>
          </div>

          <div className="surface-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">مخزون منخفض</h2>
              <Link href="/admin/inventory" className="text-xs font-medium text-brand-700 hover:underline">
                عرض الكل
              </Link>
            </div>
            <ul className="mt-4 space-y-3">
              {stats.lowStockItems.length === 0 && <p className="text-sm text-muted">لا يوجد نقص حالياً 👍</p>}
              {stats.lowStockItems.map((item) => (
                <li key={item.slug} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{item.nameAr}</span>
                  <Badge tone={item.available === 0 ? "gray" : "amber"}>
                    {item.available === 0 ? "نفد" : `${item.available} متبقي`}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="surface-card overflow-hidden">
          <div className="flex items-center justify-between p-5 pb-0">
            <h2 className="text-sm font-semibold">أحدث الطلبات</h2>
            <Link href="/admin/orders" className="text-xs font-medium text-brand-700 hover:underline">
              عرض الكل
            </Link>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t text-start text-xs text-muted">
                  <th className="px-5 py-3 text-start font-medium">رقم الطلب</th>
                  <th className="px-5 py-3 text-start font-medium">العميل</th>
                  <th className="px-5 py-3 text-start font-medium">الحالة</th>
                  <th className="px-5 py-3 text-start font-medium">الإجمالي</th>
                  <th className="px-5 py-3 text-start font-medium">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders.map((o) => {
                  const meta = ORDER_STATUS[o.status as OrderStatusKey];
                  return (
                    <tr key={o.id} className="border-t transition-colors hover:bg-ink-50 dark:hover:bg-ink-800/40">
                      <td className="px-5 py-3">
                        <Link href={`/admin/orders/${o.id}`} className="num font-medium text-brand-700 hover:underline">
                          {o.number}
                        </Link>
                      </td>
                      <td className="px-5 py-3">{o.customerName}</td>
                      <td className="px-5 py-3"><Badge tone={meta.tone}>{meta.label}</Badge></td>
                      <td className="px-5 py-3"><Price value={o.total} size="sm" /></td>
                      <td className="px-5 py-3 text-xs text-muted">{formatRelative(o.placedAt)}</td>
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
