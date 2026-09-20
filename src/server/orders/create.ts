import { db } from "@/server/db";
import { calculateTotals } from "@/server/cart/pricing";
import { PaymentMethod, PaymentStatus, OrderStatus } from "@prisma/client";

/**
 * سطر سلة للعرض والحساب. ⚠️ السلة الحقيقية المرتبطة بجلسة العميل لم
 * تُبنَ بعد (مرحلة لاحقة) — نستخدم مؤقتاً أول متغيّرين في الكتالوج
 * كبيانات عرض توضيحية، تماماً كما في صفحة السلة الحالية.
 */
export async function getCheckoutLines() {
  const variants = await db.productVariant.findMany({
    take: 2,
    include: { product: { include: { images: { take: 1, orderBy: { position: "asc" } } } } },
    orderBy: { createdAt: "asc" },
  });
  return variants.map((v, i) => ({
    variantId: v.id,
    productId: v.productId,
    nameAr: v.product.nameAr,
    sku: v.sku,
    imageUrl: v.product.images[0]?.url ?? null,
    unitPrice: Number(v.price),
    quantity: i === 0 ? 2 : 1,
  }));
}

export async function getCheckoutTotals(shippingMethod: "standard" | "express") {
  const lines = await getCheckoutLines();
  const shippingRate = shippingMethod === "express" ? 40 : 20;
  return calculateTotals({ lines, shippingRate, freeShippingAbove: shippingMethod === "express" ? null : 200 });
}

/**
 * يولّد رقم طلب متسلسل بصيغة FJ-XXXX.
 *
 * ⚠️ لا يُعتمَد على placedAt لإيجاد "آخر" رقم — بيانات البذور تُنشئ طلبات
 * بتواريخ ماضية لأغراض العرض، فقد لا يتطابق ترتيب التاريخ مع ترتيب الرقم.
 * نجلب كل الأرقام الموجودة ونحسب أكبرها مباشرة. هذا مقبول لحجم بيانات
 * تجريبي؛ في الإنتاج يُستبدل بعدّاد مخصص (تسلسل قاعدة بيانات) لتفادي
 * تعارض السباق عند الطلبات المتزامنة.
 */
async function generateOrderNumber(): Promise<string> {
  const rows = await db.order.findMany({
    where: { number: { startsWith: "FJ-" } },
    select: { number: true },
  });
  const maxNum = rows.reduce((max, r) => Math.max(max, Number(r.number.replace("FJ-", "")) || 0), 1000);
  return `FJ-${maxNum + 1}`;
}

export type CheckoutContact = {
  name: string;
  phone: string;
  email?: string;
  city: string;
  district?: string;
  street: string;
  notes?: string;
};

export type CreateOrderInput = {
  contact: CheckoutContact;
  shippingMethod: "standard" | "express";
  paymentMethod: Extract<PaymentMethod, "BANK_TRANSFER" | "COD">;
  receiptUrl?: string | null;
};

export async function createOrderFromCheckout(input: CreateOrderInput) {
  const lines = await getCheckoutLines();
  if (lines.length === 0) {
    throw new Error("السلة فارغة");
  }

  const shippingRate = input.shippingMethod === "express" ? 40 : 20;
  const totals = calculateTotals({
    lines,
    shippingRate,
    freeShippingAbove: input.shippingMethod === "express" ? null : 200,
  });

  const number = await generateOrderNumber();
  const { contact } = input;

  const order = await db.order.create({
    data: {
      number,
      email: contact.email || null,
      phone: contact.phone,
      shipToName: contact.name,
      shipToCity: contact.city,
      shipToDistrict: contact.district || null,
      shipToStreet: contact.street,
      shipToDetails: contact.notes || null,
      subtotal: totals.subtotal,
      discountTotal: totals.discountTotal,
      shippingTotal: totals.shippingTotal,
      taxTotal: totals.taxTotal,
      grandTotal: totals.grandTotal,
      status: OrderStatus.PENDING,
      items: {
        create: lines.map((l) => ({
          productId: l.productId,
          variantId: l.variantId,
          nameAr: l.nameAr,
          sku: l.sku,
          imageUrl: l.imageUrl,
          unitPrice: l.unitPrice,
          quantity: l.quantity,
          lineTotal: l.unitPrice * l.quantity,
        })),
      },
      payments: {
        create: {
          provider: input.paymentMethod === "BANK_TRANSFER" ? "bank_transfer" : "cash_on_delivery",
          method: input.paymentMethod,
          amount: totals.grandTotal,
          status: PaymentStatus.INITIATED,
          receiptUrl: input.receiptUrl ?? null,
        },
      },
      events: {
        create: {
          message:
            input.paymentMethod === "BANK_TRANSFER"
              ? "تم استلام الطلب — بانتظار مراجعة إيصال التحويل البنكي"
              : "تم استلام الطلب — الدفع عند الاستلام",
          status: OrderStatus.PENDING,
        },
      },
    },
    select: { id: true, number: true },
  });

  return order;
}
