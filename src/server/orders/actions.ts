"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { saveUploadedFile, UploadError } from "@/lib/uploads";
import { createOrderFromCheckout, ShippingError, StockError } from "@/server/orders/create";
import { requireAdmin } from "@/server/auth/session";
import { logAudit } from "@/server/audit/log";
import { getClientIp } from "@/lib/request-ip";
import { OrderStatus, PaymentStatus } from "@prisma/client";

export type CheckoutContactValues = {
  name?: string;
  phone?: string;
  email?: string;
  city?: string;
  district?: string;
  street?: string;
  notes?: string;
};

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
const orderAttempts = new Map<string, { count: number; windowStart: number }>();
const MAX_ORDERS_PER_WINDOW = 5;
const WINDOW_MS = 10 * 60 * 1000;

function readContactValues(formData: FormData): CheckoutContactValues {
  return {
    name: String(formData.get("name") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
    city: String(formData.get("city") ?? ""),
    district: String(formData.get("district") ?? ""),
    street: String(formData.get("street") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  };
}

export async function createOrderAction(
  _prevState: CheckoutFormState,
  formData: FormData,
): Promise<CheckoutFormState> {
  const values = readContactValues(formData);
  const ip = (await getClientIp()) ?? "unknown";
  const now = Date.now();
  const record = orderAttempts.get(ip);
  if (record && now - record.windowStart < WINDOW_MS) {
    if (record.count >= MAX_ORDERS_PER_WINDOW) {
      return { error: "عدد كبير من الطلبات خلال وقت قصير — يرجى المحاولة لاحقاً.", values };
    }
    record.count += 1;
  } else {
    orderAttempts.set(ip, { count: 1, windowStart: now });
  }

  const fieldErrors: Record<string, string> = {};
  for (const [key, label] of REQUIRED) {
    if (!String(formData.get(key) ?? "").trim()) fieldErrors[key] = `${label} مطلوب`;
  }

  const paymentMethod = formData.get("paymentMethod");
  if (paymentMethod !== "BANK_TRANSFER" && paymentMethod !== "COD") {
    return { error: "طريقة الدفع المختارة غير متاحة حالياً — يرجى اختيار التحويل البنكي أو الدفع عند الاستلام.", values };
  }

  let receiptUrl: string | null = null;
  if (paymentMethod === "BANK_TRANSFER") {
    if (!formData.get("confirmTransfer")) {
      fieldErrors.confirmTransfer = "يجب تأكيد إتمام التحويل قبل المتابعة";
    }
    const file = formData.get("receipt");
    if (!(file instanceof File) || file.size === 0) {
      fieldErrors.receipt = "يرجى إرفاق صورة أو ملف PDF لإيصال التحويل";
    } else {
      try {
        receiptUrl = await saveUploadedFile(file, "receipts");
      } catch (e) {
        fieldErrors.receipt = e instanceof UploadError ? e.message : "تعذّر رفع الملف، حاول مرة أخرى";
      }
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, values };
  }

  const shippingRateId = String(formData.get("shippingRateId") ?? "");
  if (!shippingRateId) {
    return { error: "يرجى اختيار طريقة الشحن", values };
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
      },
      shippingRateId,
      paymentMethod,
      receiptUrl,
    });
    orderNumber = order.number;
  } catch (e) {
    if (e instanceof StockError || e instanceof ShippingError) return { error: e.message, values };
    if (e instanceof Error && e.message === "السلة فارغة") {
      return { error: "سلتك فارغة — أضف منتجات قبل إتمام الطلب.", values };
    }
    return { error: "حدث خطأ أثناء إنشاء الطلب، يرجى المحاولة مرة أخرى.", values };
  }

  redirect(`/order/${orderNumber}`);
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

    // إعادة المخزون المخصوم عند إنشاء الطلب — الدفع لم يكتمل فعلياً فلا يبقى محجوزاً
    for (const item of order.items) {
      if (!item.variantId) continue;
      const inventory = await tx.inventoryItem.update({
        where: { variantId: item.variantId },
        data: { onHand: { increment: item.quantity } },
        select: { id: true },
      });
      await tx.inventoryMovement.create({
        data: { inventoryId: inventory.id, delta: item.quantity, reason: "استرجاع مخزون — رفض إيصال تحويل", reference: order.number },
      });
    }

    // إعادة عدّاد استخدام الكوبون — لم يكتمل الشراء فعلياً فلا يُحتسب عليه
    if (order.couponCode) {
      await tx.coupon.updateMany({ where: { code: order.couponCode, usageCount: { gt: 0 } }, data: { usageCount: { decrement: 1 } } });
    }
  });
  await logAudit({ actorId: session.sub, action: "payment.rejected", entity: "Order", entityId: order.id, diff: { reason: note } });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
}
