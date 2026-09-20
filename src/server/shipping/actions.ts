"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/session";
import { logAudit } from "@/server/audit/log";

export type ShippingFormState = { error?: string };

function parseCities(raw: string): string[] {
  return raw
    .split(/[\n,،]/)
    .map((c) => c.trim())
    .filter(Boolean);
}

export async function createShippingZoneAction(
  _prevState: ShippingFormState,
  formData: FormData,
): Promise<ShippingFormState> {
  const session = await requireAdmin();

  const nameAr = String(formData.get("nameAr") ?? "").trim();
  if (!nameAr) return { error: "اسم المنطقة مطلوب" };

  const cities = parseCities(String(formData.get("cities") ?? ""));
  if (cities.length === 0) return { error: "أضف مدينة واحدة على الأقل" };

  const zone = await db.shippingZone.create({ data: { nameAr, cities } });
  await logAudit({ actorId: session.sub, action: "shippingZone.created", entity: "ShippingZone", entityId: zone.id, diff: { nameAr, cities } });

  revalidatePath("/admin/shipping");
  return {};
}

export async function toggleShippingZoneActiveAction(zoneId: string, _formData: FormData) {
  const session = await requireAdmin();
  const zone = await db.shippingZone.findUnique({ where: { id: zoneId }, select: { isActive: true } });
  if (!zone) return;

  await db.shippingZone.update({ where: { id: zoneId }, data: { isActive: !zone.isActive } });
  await logAudit({ actorId: session.sub, action: "shippingZone.toggled", entity: "ShippingZone", entityId: zoneId, diff: { isActive: !zone.isActive } });
  revalidatePath("/admin/shipping");
}

/** الحذف يمتد تلقائياً لأسعار الشحن التابعة للمنطقة (onDelete: Cascade بالمخطط). */
export async function deleteShippingZoneAction(zoneId: string, _formData: FormData) {
  const session = await requireAdmin();
  await db.shippingZone.delete({ where: { id: zoneId } }).catch(() => null);
  await logAudit({ actorId: session.sub, action: "shippingZone.deleted", entity: "ShippingZone", entityId: zoneId });
  revalidatePath("/admin/shipping");
}

export async function createShippingRateAction(zoneId: string, formData: FormData) {
  const session = await requireAdmin();

  const nameAr = String(formData.get("nameAr") ?? "").trim();
  const priceRaw = String(formData.get("price") ?? "").trim();
  const price = Number(priceRaw);
  if (!nameAr || !priceRaw || Number.isNaN(price) || price < 0) return;

  const freeAboveRaw = String(formData.get("freeAbove") ?? "").trim();
  const freeAbove = freeAboveRaw ? Number(freeAboveRaw) : null;

  const minDaysRaw = String(formData.get("minDays") ?? "").trim();
  const maxDaysRaw = String(formData.get("maxDays") ?? "").trim();

  const rate = await db.shippingRate.create({
    data: {
      zoneId,
      nameAr,
      price,
      freeAbove: freeAbove != null && !Number.isNaN(freeAbove) ? freeAbove : null,
      minDays: minDaysRaw ? Math.round(Number(minDaysRaw)) : null,
      maxDays: maxDaysRaw ? Math.round(Number(maxDaysRaw)) : null,
    },
  });
  await logAudit({ actorId: session.sub, action: "shippingRate.created", entity: "ShippingRate", entityId: rate.id, diff: { zoneId, nameAr, price } });

  revalidatePath("/admin/shipping");
}

export async function toggleShippingRateActiveAction(rateId: string, _formData: FormData) {
  const session = await requireAdmin();
  const rate = await db.shippingRate.findUnique({ where: { id: rateId }, select: { isActive: true } });
  if (!rate) return;

  await db.shippingRate.update({ where: { id: rateId }, data: { isActive: !rate.isActive } });
  await logAudit({ actorId: session.sub, action: "shippingRate.toggled", entity: "ShippingRate", entityId: rateId, diff: { isActive: !rate.isActive } });
  revalidatePath("/admin/shipping");
}

export async function deleteShippingRateAction(rateId: string, _formData: FormData) {
  const session = await requireAdmin();
  await db.shippingRate.delete({ where: { id: rateId } }).catch(() => null);
  await logAudit({ actorId: session.sub, action: "shippingRate.deleted", entity: "ShippingRate", entityId: rateId });
  revalidatePath("/admin/shipping");
}
