import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Topbar } from "@/components/admin/Topbar";
import { Badge } from "@/components/ui/Badge";
import { Price } from "@/components/ui/Price";
import { Button } from "@/components/ui/Button";
import { PrintInvoiceButton } from "@/components/admin/PrintInvoiceButton";
import { CancelOrderForm } from "@/components/admin/CancelOrderForm";
import { ShipmentTrackingForm } from "@/components/admin/ShipmentTrackingForm";
import { db } from "@/server/db";
import { ORDER_STATUS, PAYMENT_METHOD_LABEL, type OrderStatusKey } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { confirmBankPaymentAction, rejectBankPaymentAction, updateOrderStatusAction } from "@/server/orders/actions";
import { parseCustomFieldValues } from "@/server/products/custom-fields";
import { requireAdminPage } from "@/server/auth/session";

type Props = { params: Promise<{ id: string }> };

const NEXT_STATUS: Partial<Record<OrderStatusKey, OrderStatusKey>> = {
  PENDING: "PAID",
  PAID: "PROCESSING",
  PROCESSING: "SHIPPED",
  SHIPPED: "DELIVERED",
};

export default async function AdminOrderDetailPage({ params }: Props) {
  await requireAdminPage();
  const { id } = await params;
  const order = await db.order.findUnique({
    where: { id },
    include: {
      customer: true,
      items: true,
      payments: true,
      events: { orderBy: { createdAt: "desc" } },
      shipments: true,
    },
  });
  if (!order) notFound();

  const meta = ORDER_STATUS[order.status as OrderStatusKey];
  const nextStatus = NEXT_STATUS[order.status as OrderStatusKey];
  const nextMeta = nextStatus ? ORDER_STATUS[nextStatus] : null;
  const isCancellable = (["PENDING", "PAID", "PROCESSING"] as OrderStatusKey[]).includes(order.status as OrderStatusKey);

  return (
    <>
      <Topbar
        title={`الطلب ${order.number}`}
        subtitle={formatDateTime(order.placedAt)}
        actions={
          <div className="flex flex-wrap gap-2">
            <PrintInvoiceButton />
            {isCancellable && <CancelOrderForm orderId={order.id} />}
            {nextMeta && nextStatus && (
              <form action={updateOrderStatusAction.bind(null, order.id, nextStatus)}>
                <Button size="sm" type="submit">نقل إلى: {nextMeta.label}</Button>
              </form>
            )}
          </div>
        }
      />

      <div className="grid gap-6 p-5 lg:grid-cols-3 lg:p-8">
        <div className="space-y-6 lg:col-span-2">
          <section className="surface-card overflow-hidden">
            <div className="flex items-center justify-between p-5 pb-0">
              <h2 className="text-sm font-semibold">المنتجات</h2>
              <Badge tone={meta.tone}>{meta.label}</Badge>
            </div>
            <ul className="mt-4 divide-y">
              {order.items.map((item) => {
                const customValues = parseCustomFieldValues(item.options);
                return (
                  <li key={item.id} className="flex items-center gap-4 px-5 py-4">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[var(--surface-sunken)]">
                      <Image src={item.imageUrl ?? "/products/placeholder.svg"} alt="" fill sizes="56px" className="object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.nameAr}</p>
                      <p className="num text-xs text-muted">SKU {item.sku} · الكمية {item.quantity}</p>
                      {customValues.length > 0 && (
                        <ul className="mt-1.5 space-y-0.5">
                          {customValues.map((v, i) => (
                            <li key={i} className="text-xs text-muted">
                              {v.type === "FILE" ? (
                                <>
                                  {v.label}:{" "}
                                  <a href={v.value} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-700 hover:underline">
                                    عرض الملف ↗
                                  </a>
                                </>
                              ) : (
                                <>
                                  <span className="font-medium">{v.label}:</span> {v.value}
                                </>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <Price value={item.lineTotal.toString()} size="sm" />
                  </li>
                );
              })}
            </ul>
            <dl className="space-y-2 border-t p-5 text-sm">
              <div className="flex justify-between"><dt className="text-muted">المجموع الفرعي</dt><dd><Price value={order.subtotal.toString()} size="sm" /></dd></div>
              {Number(order.discountTotal) > 0 && (
                <div className="flex justify-between text-brand-700"><dt>الخصم {order.couponCode && `(${order.couponCode})`}</dt><dd>−<Price value={order.discountTotal.toString()} size="sm" /></dd></div>
              )}
              <div className="flex justify-between"><dt className="text-muted">الشحن</dt><dd>{Number(order.shippingTotal) === 0 ? "مجاني" : <Price value={order.shippingTotal.toString()} size="sm" />}</dd></div>
              <div className="flex justify-between text-xs text-muted"><dt>شامل الضريبة</dt><dd><Price value={order.taxTotal.toString()} size="sm" /></dd></div>
              <div className="flex justify-between border-t pt-2.5 text-base font-bold"><dt>الإجمالي</dt><dd><Price value={order.grandTotal.toString()} /></dd></div>
            </dl>
          </section>

          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold">سجل الحالة</h2>
            <ol className="mt-4 space-y-4 border-e-2 border-[var(--border-subtle)] pe-4">
              {order.events.map((e) => (
                <li key={e.id} className="relative">
                  <span className="absolute -end-[21px] top-1 h-2.5 w-2.5 rounded-full bg-brand-600" />
                  <p className="text-sm font-medium">{e.message}</p>
                  <p className="text-xs text-muted">{formatDateTime(e.createdAt)}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="space-y-6">
          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold">العميل</h2>
            <p className="mt-3 text-sm font-medium">{order.customer?.name ?? order.shipToName}</p>
            <p className="num mt-1 text-sm text-muted">{order.phone}</p>
            {order.email && <p className="mt-0.5 text-sm text-muted">{order.email}</p>}
            {order.taxNumber && (
              <p className="num mt-0.5 text-sm text-muted">الرقم الضريبي: {order.taxNumber}</p>
            )}
            {order.customer && (
              <Link href={`/admin/customers/${order.customer.id}`} className="mt-3 inline-block text-xs font-medium text-brand-700 hover:underline">
                عرض ملف العميل ←
              </Link>
            )}
          </section>

          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold">عنوان الشحن</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {order.shipToStreet}
              {order.shipToDetails && `، ${order.shipToDetails}`}
              <br />
              {order.shipToDistrict && `${order.shipToDistrict}، `}
              {order.shipToCity}
            </p>
          </section>

          {order.shipments.length > 0 && (
            <section className="surface-card p-5">
              <h2 className="text-sm font-semibold">الشحنة</h2>
              <ShipmentTrackingForm orderId={order.id} shipment={order.shipments[0]} />
            </section>
          )}

          <section className="surface-card p-5">
            <h2 className="text-sm font-semibold">الدفع</h2>
            {order.payments.length === 0 ? (
              <p className="mt-3 text-sm text-muted">لم يتم الدفع بعد</p>
            ) : (
              order.payments.map((p) => {
                const pendingReview = p.method === "BANK_TRANSFER" && p.status === "INITIATED";
                const tone = p.status === "CAPTURED" ? "green" : p.status === "FAILED" ? "red" : "amber";
                const label =
                  p.status === "CAPTURED" ? "مكتمل" : pendingReview ? "بانتظار المراجعة" : p.status === "FAILED" ? "مرفوض" : p.status;

                return (
                  <div key={p.id} className="mt-3 border-t pt-3 first:border-t-0 first:pt-0">
                    <div className="flex items-center justify-between text-sm">
                      <span>{PAYMENT_METHOD_LABEL[p.method] ?? p.method}</span>
                      <Badge tone={tone}>{label}</Badge>
                    </div>
                    {p.failureReason && (
                      <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">سبب الرفض: {p.failureReason}</p>
                    )}

                    {p.receiptUrl && (
                      <div className="mt-3">
                        <p className="mb-1.5 text-xs font-medium text-muted">إيصال التحويل</p>
                        {p.receiptUrl.endsWith(".pdf") ? (
                          <a href={p.receiptUrl} target="_blank" rel="noreferrer" className="inline-block text-xs font-medium text-brand-700 hover:underline">
                            عرض ملف PDF ↗
                          </a>
                        ) : (
                          <a href={p.receiptUrl} target="_blank" rel="noreferrer" className="relative block h-40 w-full overflow-hidden rounded-lg bg-[var(--surface-sunken)]">
                            <Image src={p.receiptUrl} alt="إيصال التحويل" fill sizes="320px" className="object-contain" />
                          </a>
                        )}
                      </div>
                    )}

                    {pendingReview && (
                      <div className="mt-3 flex gap-2">
                        <form action={confirmBankPaymentAction.bind(null, order.id)}>
                          <Button size="sm">تأكيد الدفع</Button>
                        </form>
                        <form action={rejectBankPaymentAction.bind(null, order.id)}>
                          <Button variant="danger" size="sm">رفض الإيصال</Button>
                        </form>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </section>

          {order.internalNote && (
            <section className="surface-card p-5">
              <h2 className="text-sm font-semibold">ملاحظات داخلية</h2>
              <p className="mt-3 text-sm text-muted">{order.internalNote}</p>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
