"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/session";
import { logAudit } from "@/server/audit/log";
import { DiscountType } from "@prisma/client";

export type CouponFormState = { error?: string };

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export async function createCouponAction(
  _prevState: CouponFormState,
  formData: FormData,
): Promise<CouponFormState> {
  const session = await requireAdmin();

  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  if (!code) return { error: "كود الكوبون مطلوب" };
  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) {
    return { error: "الكود يجب أن يتكوّن من أحرف/أرقام إنجليزية (3-32 حرفاً) بلا مسافات" };
  }

  const typeRaw = String(formData.get("type") ?? "");
  if (!(Object.values(DiscountType) as string[]).includes(typeRaw)) {
    return { error: "نوع الخصم غير صالح" };
  }
  const type = typeRaw as DiscountType;

  const valueRaw = String(formData.get("value") ?? "").trim();
  const value = type === "FREE_SHIPPING" ? 0 : Number(valueRaw);
  if (type !== "FREE_SHIPPING") {
    if (!valueRaw || Number.isNaN(value) || value <= 0) return { error: "قيمة الخصم مطلوبة ويجب أن تكون أكبر من صفر" };
    if (type === "PERCENTAGE" && value > 100) return { error: "النسبة المئوية لا يمكن أن تتجاوز 100%" };
  }

  const minSubtotalRaw = String(formData.get("minSubtotal") ?? "").trim();
  const minSubtotal = minSubtotalRaw ? Number(minSubtotalRaw) : null;
  if (minSubtotalRaw && (Number.isNaN(minSubtotal as number) || (minSubtotal as number) < 0)) {
    return { error: "الحد الأدنى للسلة غير صالح" };
  }

  const maxDiscountRaw = String(formData.get("maxDiscount") ?? "").trim();
  const maxDiscount = maxDiscountRaw ? Number(maxDiscountRaw) : null;
  if (maxDiscountRaw && (Number.isNaN(maxDiscount as number) || (maxDiscount as number) <= 0)) {
    return { error: "الحد الأقصى للخصم غير صالح" };
  }

  const usageLimitRaw = String(formData.get("usageLimit") ?? "").trim();
  const usageLimit = usageLimitRaw ? Math.round(Number(usageLimitRaw)) : null;
  if (usageLimitRaw && (Number.isNaN(usageLimit as number) || (usageLimit as number) <= 0)) {
    return { error: "حد الاستخدام غير صالح" };
  }

  const existing = await db.coupon.findUnique({ where: { code } });
  if (existing) return { error: "هذا الكود مستخدم مسبقاً" };

  const created = await db.coupon.create({
    data: {
      code,
      type,
      value: round2(value),
      minSubtotal: minSubtotal != null ? round2(minSubtotal) : null,
      maxDiscount: maxDiscount != null ? round2(maxDiscount) : null,
      usageLimit,
      isActive: formData.get("isActive") === "on",
    },
  });

  await logAudit({ actorId: session.sub, action: "coupon.created", entity: "Coupon", entityId: created.id, diff: { code, type } });

  revalidatePath("/admin/discounts");
  return {};
}

/** تفعيل/تعطيل كوبون — مربوطة بمعرّفه عبر .bind، تستقبل FormData من <form>. */
export async function toggleCouponActiveAction(couponId: string, _formData: FormData) {
  const session = await requireAdmin();
  const target = await db.coupon.findUnique({ where: { id: couponId }, select: { isActive: true } });
  if (!target) return;

  await db.coupon.update({ where: { id: couponId }, data: { isActive: !target.isActive } });
  await logAudit({
    actorId: session.sub,
    action: "coupon.toggled",
    entity: "Coupon",
    entityId: couponId,
    diff: { isActive: !target.isActive },
  });
  revalidatePath("/admin/discounts");
}

/** حذف كوبون — لا يوجد ربط سجلّي (foreign key) بينه وبين الطلبات، فالحذف آمن. */
export async function deleteCouponAction(couponId: string, _formData: FormData) {
  const session = await requireAdmin();
  await db.coupon.delete({ where: { id: couponId } }).catch(() => null);
  await logAudit({ actorId: session.sub, action: "coupon.deleted", entity: "Coupon", entityId: couponId });
  revalidatePath("/admin/discounts");
}
