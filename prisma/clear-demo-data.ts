import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

/**
 * يحذف كل بيانات العرض التجريبي (المنتجات، الطلبات، العملاء، التقييمات)
 * دون المساس بإعدادات المتجر الحقيقية: التصنيفات، الكوبونات، مناطق
 * الشحن، إعدادات الدفع (بيانات الحساب البنكي)، والمستخدم الإداري.
 *
 * يُشغَّل مرة واحدة عبر: npx tsx prisma/clear-demo-data.ts
 */
async function main() {
  console.log("🧹 حذف بيانات العرض التجريبي…");

  await db.$transaction([
    db.orderEvent.deleteMany(),
    db.payment.deleteMany(),
    db.shipment.deleteMany(),
    db.orderItem.deleteMany(),
    db.order.deleteMany(),
    db.cartItem.deleteMany(),
    db.cart.deleteMany(),
    db.inventoryMovement.deleteMany(),
    db.inventoryItem.deleteMany(),
    db.review.deleteMany(),
    db.wishlistItem.deleteMany(),
    db.productImage.deleteMany(),
    db.productVariant.deleteMany(),
    db.product.deleteMany(),
    db.address.deleteMany(),
    db.customer.deleteMany(),
  ]);

  const remaining = {
    تصنيفات: await db.category.count(),
    كوبونات: await db.coupon.count(),
    مناطق_شحن: await db.shippingZone.count(),
    منتجات: await db.product.count(),
    طلبات: await db.order.count(),
    عملاء: await db.customer.count(),
  };

  console.log("✅ تم الحذف. الحالة الحالية:", remaining);
  console.log("💡 التصنيفات والكوبونات ومناطق الشحن وإعدادات المتجر بقيت كما هي.");
}

main()
  .catch((e) => {
    console.error("❌ فشل الحذف:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
