import Link from "next/link";
import { Topbar } from "@/components/admin/Topbar";
import { Price } from "@/components/ui/Price";
import { db } from "@/server/db";
import { formatDate, formatNumber } from "@/lib/format";

export default async function AdminCustomersPage() {
  const customers = await db.customer.findMany({
    orderBy: { createdAt: "desc" },
    include: { orders: { select: { grandTotal: true } } },
  });

  return (
    <>
      <Topbar title="العملاء" subtitle={`${formatNumber(customers.length)} عميل مسجّل`} />
      <div className="p-5 lg:p-8">
        <div className="surface-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted">
                  <th className="px-5 py-3 text-start font-medium">العميل</th>
                  <th className="px-5 py-3 text-start font-medium">التواصل</th>
                  <th className="px-5 py-3 text-start font-medium">عدد الطلبات</th>
                  <th className="px-5 py-3 text-start font-medium">إجمالي الإنفاق</th>
                  <th className="px-5 py-3 text-start font-medium">تاريخ التسجيل</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => {
                  const totalSpent = c.orders.reduce((s, o) => s + Number(o.grandTotal), 0);
                  return (
                    <tr key={c.id} className="border-t transition-colors hover:bg-ink-50 dark:hover:bg-ink-800/40">
                      <td className="px-5 py-3">
                        <Link href={`/admin/customers/${c.id}`} className="font-medium text-brand-700 hover:underline">
                          {c.name ?? "بدون اسم"}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-muted">
                        <div>{c.email}</div>
                        <div className="num text-xs">{c.phone}</div>
                      </td>
                      <td className="num px-5 py-3">{c.orders.length}</td>
                      <td className="px-5 py-3"><Price value={totalSpent} size="sm" /></td>
                      <td className="px-5 py-3 text-xs text-muted">{formatDate(c.createdAt)}</td>
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
