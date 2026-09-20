"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { saveUploadedFile, UploadError } from "@/lib/uploads";
import { createOrderFromCheckout } from "@/server/orders/create";
import { requireAdmin } from "@/server/auth/session";
import { OrderStatus, PaymentStatus } from "@prisma/client";

export type CheckoutFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

const REQUIRED: [string, string][] = [
  ["name", "الاسم الكامل"],
  ["phone", "رقم الجوال"],
  ["city", "المدينة"],
  ["street", "العنوان التفصيلي"],
];

export async function createOrderAction(
  _prevState: CheckoutFormState,
  formData: FormData,
): Promise<CheckoutFormState> {
  const fieldErrors: Record<string, string> = {};
  for (const [key, label] of REQUIRED) {
    if (!String(formData.get(key) ?? "").trim()) fieldErrors[key] = `${label} مطلوب`;
  }

  const paymentMethod = formData.get("paymentMethod");
  if (paymentMethod !== "BANK_TRANSFER" && paymentMethod !== "COD") {
    return { error: "طريقة الدفع المختارة غير متاحة حالياً — يرجى اختيار التحويل البنكي أو الدفع عند الاستلام." };
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
    return { fieldErrors };
  }

  const shippingMethod = formData.get("shippingMethod") === "express" ? "express" : "standard";

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
      shippingMethod,
      paymentMethod,
      receiptUrl,
    });
    orderNumber = order.number;
  } catch {
    return { error: "حدث خطأ أثناء إنشاء الطلب، يرجى المحاولة مرة أخرى." };
  }

  redirect(`/order/${orderNumber}`);
}

/**
 * لوحة التحكم: تأكيد إيصال تحويل بنكي — يحوّل الطلب إلى مدفوع.
 * مربوطة بمعرّف الطلب عبر .bind، فتستقبل FormData تلقائياً من <form>.
 */
export async function confirmBankPaymentAction(orderId: string, _formData: FormData) {
  await requireAdmin();
  const order = await db.order.findUnique({ where: { id: orderId }, include: { payments: true } });
  if (!order) return;
  const payment = order.payments.find((p) => p.method === "BANK_TRANSFER" && p.status === "INITIATED");
  if (!payment) return;

  await db.$transaction([
    db.payment.update({ where: { id: payment.id }, data: { status: PaymentStatus.CAPTURED } }),
    db.order.update({ where: { id: order.id }, data: { status: OrderStatus.PAID, paidAt: new Date() } }),
    db.orderEvent.create({ data: { orderId: order.id, message: "تم تأكيد الدفع من فريق المتجر بعد مراجعة الإيصال", status: OrderStatus.PAID } }),
  ]);

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
  await requireAdmin();
  const order = await db.order.findUnique({ where: { id: orderId }, include: { payments: true } });
  if (!order) return;
  const payment = order.payments.find((p) => p.method === "BANK_TRANSFER" && p.status === "INITIATED");
  if (!payment) return;

  const note = String(formData.get("reason") ?? "").trim() || "الإيصال غير واضح أو المبلغ غير مطابق";

  await db.$transaction([
    db.payment.update({ where: { id: payment.id }, data: { status: PaymentStatus.FAILED, failureReason: note } }),
    db.orderEvent.create({ data: { orderId: order.id, message: `تم رفض إيصال التحويل: ${note}` } }),
  ]);

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
}
