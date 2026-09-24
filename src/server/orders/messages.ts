import type { OrderStatus } from "@prisma/client";
import { SITE_URL } from "@/lib/constants";
import { formatPrice } from "@/lib/format";
import { orderAccessToken } from "@/server/orders/access";

type MessageOrder = {
  number: string;
  status: OrderStatus;
  customerName: string;
  grandTotal: number;
  shipment?: { carrier: string; trackingNo: string | null; trackingUrl: string | null } | null;
};

/** رسالة واتساب جاهزة للعميل حسب حالة الطلب — مع رابط صفحة طلبه الخاصة (موقّع). */
export function orderStatusMessage(order: MessageOrder, storeName: string): string {
  const link = `${SITE_URL}/order/${order.number}?t=${orderAccessToken(order.number)}`;
  const hi = `مرحباً ${order.customerName} 👋`;
  const body: Record<OrderStatus, string[]> = {
    PENDING: [`استلمنا طلبك رقم ${order.number} بقيمة ${formatPrice(order.grandTotal)}.`, "نراجع الدفع وسنؤكد طلبك قريباً."],
    PAID: [`تم تأكيد الدفع لطلبك رقم ${order.number} ✅`, "بدأنا تجهيزه الآن."],
    PROCESSING: [`طلبك رقم ${order.number} قيد التجهيز الآن 🖨️`],
    SHIPPED: [
      `تم شحن طلبك رقم ${order.number} 🚚`,
      order.shipment ? `شركة الشحن: ${order.shipment.carrier}${order.shipment.trackingNo ? ` — رقم التتبع: ${order.shipment.trackingNo}` : ""}` : "",
      order.shipment?.trackingUrl ? `تتبّع الشحنة: ${order.shipment.trackingUrl}` : "",
    ],
    DELIVERED: [`تم تسليم طلبك رقم ${order.number} 🎉`, `شكراً لثقتك بـ${storeName} — يسعدنا تقييمك للمنتجات.`],
    CANCELLED: [`تم إلغاء طلبك رقم ${order.number}.`, "لأي استفسار نحن في خدمتك."],
    REFUNDED: [`تم استرجاع مبلغ طلبك رقم ${order.number}.`, "لأي استفسار نحن في خدمتك."],
  };
  return [hi, ...body[order.status].filter(Boolean), `تفاصيل طلبك: ${link}`, storeName].join("\n");
}
