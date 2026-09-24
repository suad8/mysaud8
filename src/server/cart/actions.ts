"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { getCartSessionId, getOrCreateCartSessionId } from "@/server/cart/session";
import { getCartLines } from "@/server/cart/queries";
import { validateCoupon } from "@/server/discounts/validate";
import { saveUploadedFile, UploadError } from "@/lib/uploads";
import { parseCustomFieldDefs, type CustomFieldValue } from "@/server/products/custom-fields";

export type CartActionState = { error?: string; success?: boolean };

const MAX_CUSTOM_TEXT_LENGTH = 1000;

/** يقرأ قيم الحقول المخصّصة من النموذج حسب تعريفها بالمنتج، ويرفع أي ملفات مرفقة. */
async function readCustomFieldValues(formData: FormData, product: { customFields: unknown }): Promise<{ error: string } | { values: CustomFieldValue[] }> {
  const defs = parseCustomFieldDefs(product.customFields);
  const values: CustomFieldValue[] = [];

  for (const def of defs) {
    const raw = formData.get(`customField_${def.id}`);

    if (def.type === "FILE") {
      if (!(raw instanceof File) || raw.size === 0) {
        if (def.required) return { error: `يرجى إرفاق ملف لحقل "${def.label}"` };
        continue;
      }
      try {
        const url = await saveUploadedFile(raw, "custom-fields");
        values.push({ label: def.label, type: def.type, value: url });
      } catch (e) {
        return { error: e instanceof UploadError ? e.message : `تعذّر رفع الملف لحقل "${def.label}"` };
      }
    } else {
      const text = String(raw ?? "").trim();
      if (!text) {
        if (def.required) return { error: `حقل "${def.label}" مطلوب` };
        continue;
      }
      if (text.length > MAX_CUSTOM_TEXT_LENGTH) {
        return { error: `حقل "${def.label}" أطول من الحد المسموح (${MAX_CUSTOM_TEXT_LENGTH} حرف)` };
      }
      values.push({ label: def.label, type: def.type, value: text });
    }
  }

  return { values };
}

export async function addToCartAction(_prevState: CartActionState, formData: FormData): Promise<CartActionState> {
  const variantId = String(formData.get("variantId") ?? "");
  const quantityRaw = Math.round(Number(formData.get("quantity") ?? "1"));
  const quantity = Number.isFinite(quantityRaw) && quantityRaw > 0 ? quantityRaw : 1;
  if (!variantId) return { error: "منتج غير صالح" };

  const variant = await db.productVariant.findUnique({
    where: { id: variantId },
    include: { inventory: true, product: { select: { status: true, deletedAt: true, customFields: true } } },
  });
  if (!variant || !variant.isActive || variant.product.status !== "ACTIVE" || variant.product.deletedAt) {
    return { error: "هذا المنتج لم يعد متاحاً" };
  }

  const available = Math.max(0, (variant.inventory?.onHand ?? 0) - (variant.inventory?.reserved ?? 0));
  if (available <= 0) return { error: "نفد المخزون من هذا المنتج" };

  const customFieldsResult = await readCustomFieldValues(formData, variant.product);
  if ("error" in customFieldsResult) return { error: customFieldsResult.error };
  const customValues = customFieldsResult.values;

  const sessionId = await getOrCreateCartSessionId();
  const cart = await db.cart.upsert({
    where: { sessionId },
    create: { sessionId, status: "ACTIVE" },
    update: { status: "ACTIVE" },
  });

  // منتجات بحقول مخصّصة (كرفع تصميم): كل إضافة سطر مستقل، لا يُدمَج مع
  // إضافات سابقة لنفس الخيار حتى لا تُفقَد قيم/ملفات مختلفة بدمجها خطأً.
  if (customValues.length > 0) {
    await db.cartItem.create({
      data: { cartId: cart.id, productId: variant.productId, variantId, quantity: Math.min(available, quantity), customValues },
    });
  } else {
    const existing = await db.cartItem.findFirst({
      where: { cartId: cart.id, variantId, customValues: { equals: [] } },
    });
    const nextQuantity = Math.min(available, (existing?.quantity ?? 0) + quantity);

    if (existing) {
      await db.cartItem.update({ where: { id: existing.id }, data: { quantity: nextQuantity } });
    } else {
      await db.cartItem.create({
        data: { cartId: cart.id, productId: variant.productId, variantId, quantity: nextQuantity },
      });
    }
  }

  revalidatePath("/cart");
  revalidatePath("/", "layout");
  return { success: true };
}

/** يتحقق أن عنصر السلة يخص جلسة الزائر الحالية قبل أي تعديل — يمنع التلاعب بمعرّف عنصر لسلة غير مملوكة. */
async function getOwnedCartItem(itemId: string) {
  const sessionId = await getCartSessionId();
  if (!sessionId) return null;

  const item = await db.cartItem.findUnique({
    where: { id: itemId },
    include: { cart: true, variant: { include: { inventory: true } } },
  });
  if (!item || item.cart.sessionId !== sessionId) return null;
  return item;
}

/** زيادة الكمية بواحد — مربوطة بمعرّف العنصر عبر .bind، تستقبل FormData من <form>. */
export async function incrementCartItemAction(itemId: string, _formData: FormData) {
  const item = await getOwnedCartItem(itemId);
  if (!item) return;

  const available = Math.max(0, (item.variant.inventory?.onHand ?? 0) - (item.variant.inventory?.reserved ?? 0));
  const next = Math.min(item.quantity + 1, available);
  if (next !== item.quantity) {
    await db.cartItem.update({ where: { id: itemId }, data: { quantity: next } });
  }

  revalidatePath("/cart");
  revalidatePath("/", "layout");
}

/** إنقاص الكمية بواحد — يحذف العنصر عند الوصول لصفر. */
export async function decrementCartItemAction(itemId: string, _formData: FormData) {
  const item = await getOwnedCartItem(itemId);
  if (!item) return;

  if (item.quantity <= 1) {
    await db.cartItem.delete({ where: { id: itemId } });
  } else {
    await db.cartItem.update({ where: { id: itemId }, data: { quantity: item.quantity - 1 } });
  }

  revalidatePath("/cart");
  revalidatePath("/", "layout");
}

export async function removeCartItemAction(itemId: string, _formData: FormData) {
  const item = await getOwnedCartItem(itemId);
  if (!item) return;

  await db.cartItem.delete({ where: { id: itemId } });

  revalidatePath("/cart");
  revalidatePath("/", "layout");
}

export async function applyCouponAction(_prevState: CartActionState, formData: FormData): Promise<CartActionState> {
  const code = String(formData.get("code") ?? "").trim();
  if (!code) return { error: "أدخل كود الخصم" };

  const lines = await getCartLines();
  if (lines.length === 0) return { error: "سلتك فارغة" };
  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);

  const result = await validateCoupon(code, subtotal);
  if ("error" in result) return { error: result.error };

  const sessionId = await getOrCreateCartSessionId();
  await db.cart.update({ where: { sessionId }, data: { couponCode: result.coupon.code } });

  revalidatePath("/cart");
  revalidatePath("/checkout");
  return { success: true };
}

export async function removeCouponAction(_formData: FormData) {
  const sessionId = await getCartSessionId();
  if (!sessionId) return;

  await db.cart.updateMany({ where: { sessionId }, data: { couponCode: null } });

  revalidatePath("/cart");
  revalidatePath("/checkout");
}
