"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { deleteUploadedFile, saveUploadedFile, UploadError } from "@/lib/uploads";
import { createOrderFromCheckout, CouponError, ShippingError, StockError } from "@/server/orders/create";
import { orderAccessToken } from "@/server/orders/access";
import { requireAdmin } from "@/server/auth/session";
import { logAudit } from "@/server/audit/log";
import { getClientIp } from "@/lib/request-ip";
import { createRateLimiter } from "@/lib/rate-limit";
import { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { ORDER_STATUS, type OrderStatusKey } from "@/lib/constants";

export type CheckoutContactValues = {
  name?: string;
  phone?: string;
  email?: string;
  city?: string;
  district?: string;
  street?: string;
  notes?: string;
  taxNumber?: string;
};

const TAX_NUMBER_PATTERN = /^\d{15}$/;

export type CheckoutFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  /** يعيد ما أدخله العميل عند فشل الإرسال — Next/React يفرّغ حقول النموذج تلقائياً بعد كل Server Action. */
  values?: CheckoutContactValues;
};

const REQUIRED: [string, string][] = [
  ["name", "الاسم الكامل"],
  ["phone", "رقم الجوال"],
  ["city", "المدينة"],
  ["street", "العنوان التفصيلي"],
];

/**
 * حماية بسيطة من إغراق صفحة الدفع بطلبات وهمية متكررة — بالذاكرة داخل
 * نفس العملية (نفس قيود login rate-limit: لا تُشارك بين عدّة نسخ خادم).
 */
const orderAttempts = createRateLimiter({ max: 5, windowMs: 10 * 60 * 1000 });

function readContactValues(formData: FormData): CheckoutContactValues {
  return {
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
    city: String(formData.get("city") ?? ""),
    district: String(formData.get("district") ?? ""),
    street: String(formData.get("street") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    taxNumber: String(formData.get("taxNumber") ?? ""),
  };
}

export async function createOrderAction(
  _prevState: CheckoutFormState,
  formData: FormData,
): Promise<CheckoutFormState> {
  const values = readContactValues(formData);
  const ip = (await getClientIp()) ?? "unknown";
  if (!orderAttempts.hit(ip)) {
    return { error: "عدد كبير من الطلبات خلال وقت قصير — يرجى المحاولة لاحقاً.", values };
  }

  const fieldErrors: Record<string, string> = {};
  for (const [key, label] of REQUIRED) {
    if (!String(formData.get(key) ?? "").trim()) fieldErrors[key] = `${label} مطلوب`;
  }

  const taxNumberRaw = String(formData.get("taxNumber") ?? "").trim();
  if (taxNumberRaw && !TAX_NUMBER_PATTERN.test(taxNumberRaw)) {
    fieldErrors.taxNumber = "الرقم الضريبي يجب أن يتكوّن من 15 رقماً";
  }

  const paymentMethod = formData.get("paymentMethod");
  if (paymentMethod !== "BANK_TRANSFER" && paymentMethod !== "COD") {
    return { error: "طريقة الدفع المختارة غير متاحة حالياً — يرجى اختيار التحويل البنكي أو الدفع عند الاستلام.", values };
  }

  let receiptFile: File | null = null;
  if (paymentMethod === "BANK_TRANSFER") {
    if (!formData.get("confirmTransfer")) {
      fieldErrors.confirmTransfer = "يجب تأكيد إتمام التحويل قبل المتابعة";
    }
    const file = formData.get("receipt");
    if (!(file instanceof File) || file.size === 0) {
      fieldErrors.receipt = "يرجى إرفاق صورة أو ملف PDF لإيصال التحويل";
    } else {
      receiptFile = file;
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, values };
  }

  const shippingRateId = String(formData.get("shippingRateId") ?? "");
  if (!shippingRateId) {
    return { error: "يرجى اختيار طريقة الشحن", values };
  }

  // الإيصال يُحفظ على القرص فقط بعد نجاح كل التحققات — لا ملفات يتيمة من محاولات فاشلة
  let receiptUrl: string | null = null;
  if (receiptFile) {
    try {
      receiptUrl = await saveUploadedFile(receiptFile, "receipts");
    } catch (e) {
      return { fieldErrors: { receipt: e instanceof UploadError ? e.message : "تعذّر رفع الملف، حاول مرة أخرى" }, values };
    }
  }

  let orderNumber: string;
  try {
    const order = await createOrderFromCheckout({
      contact: {
        name: String(formData.get("name")),
        phone: String(formData.get("phone")),
        email: String(formData.get("email") ?? "") || undefined,
        city: String(formData.get("city")),
        district: String(formData.get("district") ?? "") || undefined,
        street: String(formData.get("street")),
        notes: String(formData.get("notes") ?? "") || undefined,
        taxNumber: taxNumberRaw || undefined,
      },
      shippingRateId,
      paymentMethod,
      receiptUrl,
    });
    orderNumber = order.number;
  } catch (e) {
    if (receiptUrl) await deleteUploadedFile(receiptUrl);
    if (e instanceof StockError || e instanceof ShippingError || e instanceof CouponError) return { error: e.message, values };
    if (e instanceof Error && e.message === "السلة فارغة") {
      return { error: "سلتك فارغة — أضف منتجات قبل إتمام الطلب.", values };
    }
    return { error: "حدث خطأ أثناء إنشاء الطلب، يرجى المحاولة مرة أخرى.", values };
  }

  redirect(`/order/${orderNumber}?t=${orderAccessToken(orderNumber)}`);
}

/**
 * لوحة التحكم: تأكيد إيصال تحويل بنكي — يحوّل الطلب إلى مدفوع.
 * مربوطة بمعرّف الطلب عبر .bind، فتستقبل FormData تلقائياً من <form>.
 */
export async function confirmBankPaymentAction(orderId: string, _formData: FormData) {
  const session = await requireAdmin();
  const order = await db.order.findUnique({ where: { id: orderId }, include: { payments: true } });
  if (!order) return;
  const payment = order.payments.find((p) => p.method === "BANK_TRANSFER" && p.status === "INITIATED");
  if (!payment) return;

  await db.$transaction([
    db.payment.update({ where: { id: payment.id }, data: { status: PaymentStatus.CAPTURED } }),
    db.order.update({ where: { id: order.id }, data: { status: OrderStatus.PAID, paidAt: new Date() } }),
    db.orderEvent.create({ data: { orderId: order.id, message: "تم تأكيد الدفع من فريق المتجر بعد مراجعة الإيصال", status: OrderStatus.PAID } }),
  ]);
  await logAudit({ actorId: session.sub, action: "payment.confirmed", entity: "Order", entityId: order.id });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
}

type OrderItemForRestore = { variantId: string | null; quantity: number };

/**
 * يعيد المخزون المخصوم عند إنشاء الطلب وعدّاد استخدام الكوبون — مشتركة بين
 * رفض إيصال تحويل وإلغاء الطلب، فكلاهما يعني أن البيع لم يكتمل فعلياً.
 */
async function restoreOrderStockAndCoupon(
  tx: Prisma.TransactionClient,
  order: { number: string; couponCode: string | null; items: OrderItemForRestore[] },
  reason: string,
) {
  for (const item of order.items) {
    if (!item.variantId) continue;
    const inventory = await tx.inventoryItem.update({
      where: { variantId: item.variantId },
      data: { onHand: { increment: item.quantity } },
      select: { id: true },
    });
    await tx.inventoryMovement.create({
      data: { inventoryId: inventory.id, delta: item.quantity, reason, reference: order.number },
    });
  }

  if (order.couponCode) {
    await tx.coupon.updateMany({ where: { code: order.couponCode, usageCount: { gt: 0 } }, data: { usageCount: { decrement: 1 } } });
  }
}

/**
 * لوحة التحكم: رفض إيصال غير صحيح أو غير واضح.
 * مربوطة كـ Server Action بمعرّف الطلب عبر .bind، فتستقبل FormData
 * كوسيط ثانٍ تلقائياً من عنصر <form> — منها نقرأ سبب الرفض.
 */
export async function rejectBankPaymentAction(orderId: string, formData: FormData) {
  const session = await requireAdmin();
  const order = await db.order.findUnique({ where: { id: orderId }, include: { payments: true, items: true } });
  if (!order) return;
  const payment = order.payments.find((p) => p.method === "BANK_TRANSFER" && p.status === "INITIATED");
  if (!payment) return;

  const note = String(formData.get("reason") ?? "").trim() || "الإيصال غير واضح أو المبلغ غير مطابق";

  await db.$transaction(async (tx) => {
    await tx.payment.update({ where: { id: payment.id }, data: { status: PaymentStatus.FAILED, failureReason: note } });
    await tx.orderEvent.create({ data: { orderId: order.id, message: `تم رفض إيصال التحويل: ${note}` } });
    await restoreOrderStockAndCoupon(tx, order, "استرجاع مخزون — رفض إيصال تحويل");
  });
  await logAudit({ actorId: session.sub, action: "payment.rejected", entity: "Order", entityId: order.id, diff: { reason: note } });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
}

const NEXT_STATUS: Partial<Record<OrderStatusKey, OrderStatusKey>> = {
  PENDING: "PAID",
  PAID: "PROCESSING",
  PROCESSING: "SHIPPED",
  SHIPPED: "DELIVERED",
};

const STATUS_EVENT_MESSAGE: Partial<Record<OrderStatusKey, string>> = {
  PAID: "تم تأكيد الدفع",
  PROCESSING: "الطلب قيد التجهيز",
  SHIPPED: "تم شحن الطلب",
  DELIVERED: "تم تسليم الطلب للعميل",
};

/**
 * لوحة التحكم: نقل الطلب لحالته التالية في التسلسل (PENDING→PAID→PROCESSING→SHIPPED→DELIVERED).
 * التحقّق من صحة الانتقال يُعاد حسابه من حالة الطلب الفعلية بالخادم، لا يُوثَق بما يُرسله الزر مباشرة.
 * مربوطة بمعرّف الطلب والحالة المستهدفة عبر .bind.
 */
export async function updateOrderStatusAction(orderId: string, targetStatus: OrderStatusKey, _formData: FormData) {
  const session = await requireAdmin();
  const order = await db.order.findUnique({ where: { id: orderId }, select: { status: true, number: true } });
  if (!order) return;

  const expectedNext = NEXT_STATUS[order.status as OrderStatusKey];
  if (expectedNext !== targetStatus) return; // انتقال غير صالح من الحالة الحالية — يُتجاهَل بصمت

  await db.$transaction(async (tx) => {
    await tx.order.update({
      where: { id: orderId },
      data: { status: targetStatus, paidAt: targetStatus === "PAID" ? new Date() : undefined },
    });
    await tx.orderEvent.create({
      data: { orderId, message: STATUS_EVENT_MESSAGE[targetStatus] ?? "تحديث حالة الطلب", status: targetStatus as OrderStatus },
    });

    if (targetStatus === "SHIPPED") {
      const existing = await tx.shipment.findFirst({ where: { orderId } });
      if (!existing) {
        await tx.shipment.create({ data: { orderId, carrier: "شركة الشحن", shippedAt: new Date() } });
      } else if (!existing.shippedAt) {
        await tx.shipment.update({ where: { id: existing.id }, data: { shippedAt: new Date() } });
      }
    }
    if (targetStatus === "DELIVERED") {
      const existing = await tx.shipment.findFirst({ where: { orderId } });
      if (existing && !existing.deliveredAt) {
        await tx.shipment.update({ where: { id: existing.id }, data: { deliveredAt: new Date() } });
      }
    }
  });
  await logAudit({ actorId: session.sub, action: "order.statusUpdated", entity: "Order", entityId: orderId, diff: { from: order.status, to: targetStatus } });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
}

const CANCELLABLE_STATUSES: OrderStatusKey[] = ["PENDING", "PAID", "PROCESSING"];

/**
 * لوحة التحكم: إلغاء طلب لم يُشحَن بعد — يعيد المخزون وعدّاد الكوبون تلقائياً.
 * مربوطة بمعرّف الطلب عبر .bind، تستقبل FormData من <form> (حقل "reason").
 */
export async function cancelOrderAction(orderId: string, formData: FormData) {
  const session = await requireAdmin();
  const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order || !CANCELLABLE_STATUSES.includes(order.status as OrderStatusKey)) return;

  const reason = String(formData.get("reason") ?? "").trim() || "إلغاء بطلب من فريق المتجر";

  await db.$transaction(async (tx) => {
    await tx.order.update({ where: { id: orderId }, data: { status: OrderStatus.CANCELLED, cancelledAt: new Date() } });
    await tx.orderEvent.create({ data: { orderId, message: `تم إلغاء الطلب: ${reason}`, status: OrderStatus.CANCELLED } });
    await restoreOrderStockAndCoupon(tx, order, "استرجاع مخزون — إلغاء طلب");
  });
  await logAudit({ actorId: session.sub, action: "order.cancelled", entity: "Order", entityId: orderId, diff: { reason } });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
}

/**
 * لوحة التحكم: تحديث بيانات تتبّع الشحنة (الناقل ورقم التتبّع) بعد إنشائها تلقائياً عند الشحن.
 */
export async function updateShipmentTrackingAction(orderId: string, formData: FormData) {
  const session = await requireAdmin();
  const shipment = await db.shipment.findFirst({ where: { orderId } });
  if (!shipment) return;

  const carrier = String(formData.get("carrier") ?? "").trim() || shipment.carrier;
  const trackingNo = String(formData.get("trackingNo") ?? "").trim() || null;
  const trackingUrl = String(formData.get("trackingUrl") ?? "").trim() || null;

  await db.shipment.update({ where: { id: shipment.id }, data: { carrier, trackingNo, trackingUrl } });
  await logAudit({ actorId: session.sub, action: "shipment.updated", entity: "Shipment", entityId: shipment.id, diff: { carrier, trackingNo } });

  revalidatePath(`/admin/orders/${orderId}`);
}
