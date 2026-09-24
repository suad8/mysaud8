import { notFound } from "next/navigation";
import Link from "next/link";
import { Topbar } from "@/components/admin/Topbar";
import { Badge } from "@/components/ui/Badge";
import { Price } from "@/components/ui/Price";
import { db } from "@/server/db";
import { ORDER_STATUS, type OrderStatusKey } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { requireAdminPage } from "@/server/auth/session";

type Props = { params: Promise<{ id: string }> };

export default async function AdminCustomerDetailPage({ params }: Props) {
  await requireAdminPage();
  const { id } = await params;
  const customer = await db.customer.findUnique({
    where: { id },
    include: { orders: { orderBy: { placedAt: "desc" } }, addresses: true },
  });
  if (!customer) notFound();

  const totalSpent = customer.orders.reduce((s, o) => s + Number(o.grandTotal), 0);

  return (
    <>
      <Topbar title={customer.name ?? "عميل"} subtitle={`عميل منذ ${formatDate(customer.createdAt)}`} />
      <div className="grid gap-6 p-5 lg:grid-cols-3 lg:p-8">
        <div className="space-y-6 lg:col-span-2">
          <section className="surface-card overflow-hidden">
            <h2 className="p-5 pb-0 text-sm font-semibold">سجل الطلبات</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted">
                    <th className="px-5 py-3 text-start font-medium">رقم الطلب</th>
                    <th className="px-5 py-3 text-start font-medium">الحالة</th>
                    <th className="px-5 py-3 text-start font-medium">الإجمالي</th>
                    <th className="px-5 py-3 text-start font-medium">التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.orders.map((o) => {
                    const meta = ORDER_STATUS[o.status as OrderStatusKey];
                    return (
                      <tr key={o.id} className="border-t">
                        <td className="px-5 py-3">
                          <Link href={`/admin/orders/${o.id}`} className="num font-medium text-brand-700 hover:underline">{o.number}</Link>
                        </td>
                        <td className="px-5 py-3"><Badge tone={meta.tone}>{meta.label}</Badge></td>
                        <td className="px-5 py-3"><Price value={o.grandTotal.toString()} size="sm" /></td>
                        <td className="px-5 py-3 text-xs text-muted">{formatDate(o.placedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold">بيانات التواصل</h2>
            <p className="mt-3 text-sm">{customer.email}</p>
            <p className="num mt-1 text-sm text-muted">{customer.phone}</p>
          </section>

          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold">إجمالي الإنفاق</h2>
            <p className="mt-2"><Price value={totalSpent} size="lg" /></p>
          </section>

          {customer.addresses.length > 0 && (
            <section className="surface-card p-5">
              <h2 className="text-sm font-semibold">العناوين</h2>
              {customer.addresses.map((a) => (
                <p key={a.id} className="mt-3 text-sm leading-relaxed text-muted">
                  {a.street}، {a.district}، {a.city}
                </p>
              ))}
            </section>
          )}
        </div>
      </div>
    </>
  );
}
