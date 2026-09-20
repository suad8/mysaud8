import { db } from "@/server/db";
import type { DiscountInput } from "@/server/cart/pricing";
import type { Coupon } from "@prisma/client";

export type CouponValidation = { coupon: Coupon } | { error: string };

/**
 * تحقّق كامل من صلاحية كود خصم مقابل مجموع فرعي معيّن — مستخدَم عند تطبيق
 * الكود بصفحة السلة (تغذية راجعة فورية) وعند إنشاء الطلب فعلياً (تحقّق
 * نهائي؛ لا يُعتمَد أبداً على خصم محسوب في المتصفح).
 */
export async function validateCoupon(code: string, subtotal: number): Promise<CouponValidation> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return { error: "أدخل كود الخصم" };

  const coupon = await db.coupon.findUnique({ where: { code: normalized } });
  if (!coupon) return { error: "كود الخصم غير صحيح" };
  if (!coupon.isActive) return { error: "هذا الكود لم يعد فعّالاً" };

  const now = new Date();
  if (coupon.startsAt && now < coupon.startsAt) return { error: "هذا الكود لم يبدأ العمل به بعد" };
  if (coupon.endsAt && now > coupon.endsAt) return { error: "انتهت صلاحية هذا الكود" };
  if (coupon.usageLimit != null && coupon.usageCount >= coupon.usageLimit) {
    return { error: "تم استنفاد عدد مرات استخدام هذا الكود" };
  }
  if (coupon.minSubtotal != null && subtotal < Number(coupon.minSubtotal)) {
    return { error: `الحد الأدنى للطلب لاستخدام هذا الكود ${Number(coupon.minSubtotal).toFixed(0)} ر.س` };
  }

  return { coupon };
}

export function couponToDiscountInput(coupon: Coupon): DiscountInput {
  if (coupon.type === "PERCENTAGE") {
    return {
      type: "PERCENTAGE",
      value: Number(coupon.value),
      maxDiscount: coupon.maxDiscount == null ? null : Number(coupon.maxDiscount),
    };
  }
  if (coupon.type === "FIXED") {
    return { type: "FIXED", value: Number(coupon.value) };
  }
  return { type: "FREE_SHIPPING" };
}
