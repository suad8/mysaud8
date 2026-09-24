"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/session";

/** يسجّل أن المتجر أرسل تذكيراً لهذه السلة (عند ضغط زر واتساب في «السلات المتروكة»). */
export async function markCartRemindedAction(cartId: string): Promise<void> {
  await requireAdmin();
  if (typeof cartId !== "string" || cartId.length > 40) return;
  const cart = await db.cart.findUnique({ where: { id: cartId }, select: { status: true, updatedAt: true } });
  if (cart?.status !== "ACTIVE") return;
  // updatedAt = آخر نشاط للعميل — تسجيل التذكير لا يُحسب نشاطاً (وإلا اختفت السلة من القائمة)
  await db.cart.update({ where: { id: cartId }, data: { remindedAt: new Date(), updatedAt: cart.updatedAt } });
  revalidatePath("/admin/abandoned-carts");
}
