import { db } from "@/server/db";
import { calculateTotals } from "@/server/cart/pricing";
import { getCartLines } from "@/server/cart/queries";
import { getCartSessionId } from "@/server/cart/session";
import { validateCoupon, couponToDiscountInput } from "@/server/discounts/validate";
import { PaymentMethod, PaymentStatus, OrderStatus, Prisma } from "@prisma/client";

/** يُرمى عند نفاد مخزون سطر بالسلة عند إنشاء الطلب — رسالة مخصّصة تُعرض للعميل بدل خطأ عام. */
export class StockError extends Error {}

/** يُرمى عند اختيار سعر شحن غير موجود أو مُعطَّل — لا يُعتمَد أبداً على سعر يرسله المتصفح مباشرة. */
export class ShippingError extends Error {}

export async function getCheckoutLines() {
  return getCartLines();
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
  /** الرقم الضريبي الاختياري — لإصدار فاتورة ضريبية للشركات */
  taxNumber?: string;
};

export type CreateOrderInput = {
  contact: CheckoutContact;
  shippingRateId: string;
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

  // سعر الشحن يُعاد جلبه من القاعدة دائماً بمعرّفه — لا يُوثَق بسعر قد يُرسَل من المتصفح مباشرة
  const rate = await db.shippingRate.findUnique({ where: { id: input.shippingRateId }, select: { isActive: true, price: true, freeAbove: true, zone: { select: { isActive: true } } } });
  if (!rate || !rate.isActive || !rate.zone.isActive) {
    throw new ShippingError("طريقة الشحن المختارة لم تعد متاحة، يرجى اختيار طريقة أخرى.");
  }

  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const sessionId = await getCartSessionId();
  const cart = sessionId ? await db.cart.findUnique({ where: { sessionId }, select: { id: true, couponCode: true } }) : null;

  // التحقق النهائي من الكوبون هنا فقط — يُسقَط بصمت إن لم يعد صالحاً بدل رفض الطلب كاملاً
  const couponResult = cart?.couponCode ? await validateCoupon(cart.couponCode, subtotal) : null;
  const validCoupon = couponResult && "coupon" in couponResult ? couponResult.coupon : null;

  const totals = calculateTotals({
    lines,
    discount: validCoupon ? couponToDiscountInput(validCoupon) : null,
    shippingRate: Number(rate.price),
    freeShippingAbove: rate.freeAbove == null ? null : Number(rate.freeAbove),
  });

  const { contact } = input;

  for (let attempt = 1; attempt <= MAX_ORDER_NUMBER_RETRIES; attempt++) {
    const number = await generateOrderNumber();
    try {
      return await db.$transaction(async (tx) => {
        // ربط الطلب بسجل عميل حقيقي (زائر) بالبحث برقم الجوال — يجعل صفحة
        // "العملاء" بلوحة التحكم تعكس عملاء حقيقيين بدل البقاء فارغة دائماً
        const customer = await tx.customer.upsert({
          where: { phone: contact.phone },
          create: { phone: contact.phone, name: contact.name, email: contact.email || null, isGuest: true },
          update: { name: contact.name },
        });

        const order = await tx.order.create({
          data: {
            number,
            customerId: customer.id,
            email: contact.email || null,
            phone: contact.phone,
            shipToName: contact.name,
            shipToCity: contact.city,
            shipToDistrict: contact.district || null,
            shipToStreet: contact.street,
            shipToDetails: contact.notes || null,
            taxNumber: contact.taxNumber || null,
            subtotal: totals.subtotal,
            discountTotal: totals.discountTotal,
            shippingTotal: totals.shippingTotal,
            taxTotal: totals.taxTotal,
            grandTotal: totals.grandTotal,
            couponCode: validCoupon?.code ?? null,
            status: OrderStatus.PENDING,
            items: {
              create: lines.map((l) => ({
                productId: l.productId,
                variantId: l.variantId,
                nameAr: l.nameAr,
                sku: l.sku,
                imageUrl: l.imageUrl,
                options: l.customValues,
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

        if (validCoupon) {
          await tx.coupon.update({ where: { id: validCoupon.id }, data: { usageCount: { increment: 1 } } });
        }

        // إفراغ السلة وتحويلها بعد نجاح الطلب — تبدأ سلة جديدة فارغة للزيارة القادمة
        if (cart) {
          await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
          await tx.cart.update({ where: { id: cart.id }, data: { status: "CONVERTED" } });
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
