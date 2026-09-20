"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { getCartSessionId, getOrCreateCartSessionId } from "@/server/cart/session";

export type CartActionState = { error?: string; success?: boolean };

export async function addToCartAction(_prevState: CartActionState, formData: FormData): Promise<CartActionState> {
  const variantId = String(formData.get("variantId") ?? "");
  const quantityRaw = Math.round(Number(formData.get("quantity") ?? "1"));
  const quantity = Number.isFinite(quantityRaw) && quantityRaw > 0 ? quantityRaw : 1;
  if (!variantId) return { error: "منتج غير صالح" };

  const variant = await db.productVariant.findUnique({
    where: { id: variantId },
    include: { inventory: true, product: { select: { status: true, deletedAt: true } } },
  });
  if (!variant || !variant.isActive || variant.product.status !== "ACTIVE" || variant.product.deletedAt) {
    return { error: "هذا المنتج لم يعد متاحاً" };
  }

  const available = Math.max(0, (variant.inventory?.onHand ?? 0) - (variant.inventory?.reserved ?? 0));
  if (available <= 0) return { error: "نفد المخزون من هذا المنتج" };

  const sessionId = await getOrCreateCartSessionId();
  const cart = await db.cart.upsert({
    where: { sessionId },
    create: { sessionId, status: "ACTIVE" },
    update: { status: "ACTIVE" },
  });

  const existing = await db.cartItem.findUnique({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
  });
  const nextQuantity = Math.min(available, (existing?.quantity ?? 0) + quantity);

  if (existing) {
    await db.cartItem.update({ where: { id: existing.id }, data: { quantity: nextQuantity } });
  } else {
    await db.cartItem.create({
      data: { cartId: cart.id, productId: variant.productId, variantId, quantity: nextQuantity },
    });
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
