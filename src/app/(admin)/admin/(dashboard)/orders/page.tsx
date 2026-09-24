import Link from "next/link";
import { Topbar } from "@/components/admin/Topbar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Price } from "@/components/ui/Price";
import { db } from "@/server/db";
import { ORDER_STATUS, type OrderStatusKey } from "@/lib/constants";
import { formatDateTime, formatNumber } from "@/lib/format";
import { requireAdminPage } from "@/server/auth/session";
import { orderSearchWhere } from "@/server/orders/search";

const FILTERS: (OrderStatusKey | "ALL")[] = ["ALL", "PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];
const PAGE_SIZE = 30;

type Props = { searchParams: Promise<{ status?: string; q?: string; page?: string }> };

export default async function AdminOrdersPage({ searchParams }: Props) {
  await requireAdminPage();
  const { status: rawStatus, q = "", page: rawPage } = await searchParams;
  const status = FILTERS.find((f) => f === rawStatus) ?? "ALL";
  const page = Math.min(1000, Math.max(1, Math.floor(Number(rawPage) || 1)));
  const where = orderSearchWhere({ status, q });

  const [orders, total, counts] = await Promise.all([
    db.order.findMany({
      where,
      orderBy: { placedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { customer: { select: { name: true } }, items: { select: { quantity: true } } },
    }),
    db.order.count({ where }),
    // العدّ لكل حالة يتبع البحث الحالي — ترى كم طلباً مطابقاً في كل تبويب
    db.order.groupBy({ by: ["status"], where: orderSearchWhere({ status: "ALL", q }), _count: { _all: true } }),
  ]);

  const countOf = (key: OrderStatusKey | "ALL") =>
    key === "ALL" ? counts.reduce((s, c) => s + c._count._all, 0) : (counts.find((c) => c.status === key)?._count._all ?? 0);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (params: Record<string, string | number | undefined>) => {
    const sp = new URLSearchParams();
    const merged: Record<string, string | number | undefined> = { status, q: q.trim() || undefined, ...params };
    for (const [k, v] of Object.entries(merged)) {
      if (v === undefined || v === "" || (k === "status" && v === "ALL") || (k === "page" && Number(v) === 1)) continue;
      sp.set(k, String(v));
    }
    const s = sp.toString();
    return s ? `?${s}` : "";
  };

  return (
    <>
      <Topbar
        title="الطلبات"
        subtitle={`${formatNumber(total)} طلب${q.trim() ? " مطابق للبحث" : ""}`}
        actions={
          <a href={`/admin/orders/export${qs({ page: undefined })}`} className="inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold hover:bg-[var(--surface-sunken)]">
            ⬇ تصدير Excel
          </a>
        }
      />

      <div className="p-5 lg:p-8">
        <form method="GET" className="mb-4 flex flex-wrap gap-2">
          {status !== "ALL" && <input type="hidden" name="status" value={status} />}
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="ابحث برقم الطلب أو الجوال أو اسم العميل…"
            aria-label="بحث في الطلبات"
            className="h-10 min-w-56 flex-1 rounded-lg border bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-brand-500/40"
          />
          <Button type="submit" variant="secondary" size="sm">بحث</Button>
          {q.trim() && (
            <Link href={`/admin/orders${status === "ALL" ? "" : `?status=${status}`}`} className="self-center text-xs font-medium text-muted hover:text-brand-700">
              مسح البحث
            </Link>
          )}
        </form>

        <div className="scroll-x flex gap-2 pb-4">
          {FILTERS.map((f) => {
            const n = countOf(f);
            if (f !== "ALL" && n === 0 && f !== status && (f === "REFUNDED" || f === "CANCELLED")) return null;
            return (
              <Link
                key={f}
                href={`/admin/orders${qs({ status: f, page: undefined })}`}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors ${
                  status === f ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300" : "text-muted hover:bg-ink-100 dark:hover:bg-ink-800"
                }`}
              >
                {f === "ALL" ? "الكل" : ORDER_STATUS[f].label}
                <span className="num rounded-full bg-[var(--surface-sunken)] px-1.5 text-[11px]">{formatNumber(n)}</span>
              </Link>
            );
          })}
        </div>

        <div className="surface-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted">
                  <th className="px-5 py-3 text-start font-medium">رقم الطلب</th>
                  <th className="px-5 py-3 text-start font-medium">العميل</th>
                  <th className="px-5 py-3 text-start font-medium">المدينة</th>
                  <th className="px-5 py-3 text-start font-medium">القطع</th>
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
                      <td className="px-5 py-3">
                        <span className="block">{o.customer?.name ?? o.shipToName}</span>
                        <span className="num text-xs text-muted" dir="ltr">{o.phone}</span>
                      </td>
                      <td className="px-5 py-3 text-muted">{o.shipToCity}</td>
                      <td className="num px-5 py-3 text-muted">{formatNumber(o.items.reduce((s, i) => s + i.quantity, 0))}</td>
                      <td className="px-5 py-3"><Price value={o.grandTotal.toString()} size="sm" /></td>
                      <td className="px-5 py-3"><Badge tone={meta.tone}>{meta.label}</Badge></td>
                      <td className="px-5 py-3 text-xs text-muted">{formatDateTime(o.placedAt)}</td>
                    </tr>
                  );
                })}
                {orders.length === 0 && (
                  <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-muted">لا توجد طلبات مطابقة</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {pageCount > 1 && (
            <nav className="flex items-center justify-between border-t px-5 py-3 text-sm" aria-label="صفحات الطلبات">
              {page > 1 ? <Link href={`/admin/orders${qs({ page: page - 1 })}`} className="font-medium text-brand-700 hover:underline">→ السابق</Link> : <span />}
              <span className="num text-xs text-muted">صفحة {formatNumber(page)} من {formatNumber(pageCount)}</span>
              {page < pageCount ? <Link href={`/admin/orders${qs({ page: page + 1 })}`} className="font-medium text-brand-700 hover:underline">التالي ←</Link> : <span />}
            </nav>
          )}
        </div>
      </div>
    </>
  );
}
