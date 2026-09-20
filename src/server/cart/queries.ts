import { db } from "@/server/db";
import { getCartSessionId } from "@/server/cart/session";

async function getCart() {
  const sessionId = await getCartSessionId();
  if (!sessionId) return null;

  return db.cart.findUnique({
    where: { sessionId },
    include: {
      items: {
        include: {
          variant: { include: { inventory: true } },
          product: { include: { images: { take: 1, orderBy: { position: "asc" } } } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export type CartLine = {
  itemId: string;
  variantId: string;
  productId: string;
  sku: string;
  slug: string;
  nameAr: string;
  optionsLabel: string;
  imageUrl: string;
  unitPrice: number;
  quantity: number;
  /** المتاح فعلياً الآن (onHand - reserved) — للتحقق قبل الدفع وتحديد الحد الأقصى للزيادة */
  available: number;
};

/**
 * أسطر السلة الحقيقية للعرض (صفحة السلة) وللدفع (صفحة الدفع وإنشاء الطلب) —
 * مصدر واحد يضمن تطابق ما يراه العميل مع ما يُخصم من مخزونه فعلياً.
 * تُستبعد عناصر لمنتجات/متغيّرات أُلغيت أو حُذفت بعد إضافتها للسلة.
 */
export async function getCartLines(): Promise<CartLine[]> {
  const cart = await getCart();
  if (!cart || cart.status !== "ACTIVE") return [];

  return cart.items
    .filter((item) => item.variant.isActive && item.product.status === "ACTIVE" && !item.product.deletedAt)
    .map((item) => ({
      itemId: item.id,
      variantId: item.variantId,
      productId: item.productId,
      sku: item.variant.sku,
      slug: item.product.slug,
      nameAr: item.product.nameAr,
      optionsLabel: Object.values(item.variant.options as Record<string, string>).join(" · "),
      imageUrl: item.product.images[0]?.url ?? "/products/placeholder.svg",
      unitPrice: Number(item.variant.price),
      quantity: item.quantity,
      available: Math.max(0, (item.variant.inventory?.onHand ?? 0) - (item.variant.inventory?.reserved ?? 0)),
    }));
}

export async function getCartItemCount(): Promise<number> {
  const sessionId = await getCartSessionId();
  if (!sessionId) return 0;

  const cart = await db.cart.findUnique({
    where: { sessionId },
    select: { status: true, items: { select: { quantity: true } } },
  });
  if (!cart || cart.status !== "ACTIVE") return 0;

  return cart.items.reduce((sum, i) => sum + i.quantity, 0);
}
