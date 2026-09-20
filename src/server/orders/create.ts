import { db } from "@/server/db";
import { calculateTotals } from "@/server/cart/pricing";
import { getCartLines } from "@/server/cart/queries";
import { getCartSessionId } from "@/server/cart/session";
import { PaymentMethod, PaymentStatus, OrderStatus, Prisma } from "@prisma/client";

/** يُرمى عند نفاد مخزون سطر بالسلة عند إنشاء الطلب — رسالة مخصّصة تُعرض للعميل بدل خطأ عام. */
export class StockError extends Error {}

export async function getCheckoutLines() {
  return getCartLines();
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
 * نجلب كل الأرقام الموجودة ونحسب أكبرها مباشرة. سباق الطلبات المتزامنة
 * (نفس الرقم يُحسَب لطلبين في اللحظة نفسها) يُحلّ عبر إعادة المحاولة في
 * createOrderFromCheckout عند تصادم قيد UNIQUE بدل تجاهله.
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

const MAX_ORDER_NUMBER_RETRIES = 3;

export async function createOrderFromCheckout(input: CreateOrderInput) {
  const lines = await getCheckoutLines();
  if (lines.length === 0) {
    throw new Error("السلة فارغة");
  }
  for (const line of lines) {
    if (line.quantity > line.available) {
      throw new StockError(`الكمية المطلوبة من "${line.nameAr}" لم تعد متوفرة بالكامل (المتاح الآن: ${line.available})`);
    }
  }

  const shippingRate = input.shippingMethod === "express" ? 40 : 20;
  const totals = calculateTotals({
    lines,
    shippingRate,
    freeShippingAbove: input.shippingMethod === "express" ? null : 200,
  });

  const { contact } = input;
  const sessionId = await getCartSessionId();

  for (let attempt = 1; attempt <= MAX_ORDER_NUMBER_RETRIES; attempt++) {
    const number = await generateOrderNumber();
    try {
      return await db.$transaction(async (tx) => {
        const order = await tx.order.create({
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

        // خصم المخزون فعلياً عند إنشاء الطلب (وليس عند تأكيد الدفع) — يمنع
        // بيع نفس القطعة لأكثر من عميل بين إنشاء الطلب ومراجعته من الفريق.
        // يُعاد المخزون تلقائياً إن رُفض إيصال التحويل لاحقاً (انظر orders/actions.ts).
        for (const line of lines) {
          const inventory = await tx.inventoryItem.update({
            where: { variantId: line.variantId },
            data: { onHand: { decrement: line.quantity } },
            select: { id: true },
          });
          await tx.inventoryMovement.create({
            data: { inventoryId: inventory.id, delta: -line.quantity, reason: "طلب جديد", reference: order.number },
          });
        }

        // إفراغ السلة وتحويلها بعد نجاح الطلب — تبدأ سلة جديدة فارغة للزيارة القادمة
        if (sessionId) {
          const cart = await tx.cart.findUnique({ where: { sessionId }, select: { id: true } });
          if (cart) {
            await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
            await tx.cart.update({ where: { id: cart.id }, data: { status: "CONVERTED" } });
          }
        }

        return order;
      });
    } catch (e) {
      const isDuplicateNumber = e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
      if (isDuplicateNumber && attempt < MAX_ORDER_NUMBER_RETRIES) continue; // تصادم رقم طلب مع طلب متزامن — أعد المحاولة برقم جديد
      throw e;
    }
  }
  throw new Error("تعذّر إنشاء رقم طلب فريد، يرجى المحاولة مرة أخرى.");
}
