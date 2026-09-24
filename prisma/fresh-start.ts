import { PrismaClient } from "@prisma/client";
import { applyBrand, writeSetting } from "./brand";
import { assertDestructiveAllowed } from "./guard";
import { DEMO_CATEGORY_SLUGS, DEMO_COUPON_CODES, DEMO_IBAN } from "../src/server/demo/demo-data";

const db = new PrismaClient();

/**
 * بداية نظيفة للمتجر: يحذف كل المنتجات والطلبات والعملاء والتقييمات
 * (بيانات العرض التجريبي لمتجر القهوة) + تصنيفات وكوبونات العرض التجريبي،
 * ويزيل بيانات الحساب البنكي الوهمية إن لم تُعدَّل، ثم يطبّق هوية المتجر.
 *
 * ⚠️ لا رجعة فيه — يُشغَّل مرة واحدة قبل رفع منتجاتك الحقيقية.
 * يبقى كما هو: حساب المدير، مناطق الشحن، إعدادات بوابة الدفع، الثيم، والصفحات.
 */

async function main() {
  assertDestructiveAllowed("db:fresh-start");
  const before = {
    منتجات: await db.product.count(),
    طلبات: await db.order.count(),
    عملاء: await db.customer.count(),
    تقييمات: await db.review.count(),
  };
  console.log("قبل الحذف:", before);

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
    db.category.deleteMany({ where: { slug: { in: DEMO_CATEGORY_SLUGS } } }),
    db.coupon.deleteMany({ where: { code: { in: DEMO_COUPON_CODES } } }),
  ]);
  console.log("✓ حُذفت المنتجات والطلبات والعملاء والتقييمات وتصنيفات وكوبونات العرض التجريبي");

  const bank = await db.setting.findUnique({ where: { key: "payment.bankTransfer" } });
  const bankValue = (bank?.value ?? {}) as Record<string, unknown>;
  if (bankValue.iban === DEMO_IBAN) {
    await writeSetting(db, "payment.bankTransfer", { enabled: false, bankName: "", accountName: "", iban: "", accountNumber: "" });
    console.log("✓ أُزيلت بيانات الحساب البنكي الوهمية — أدخل حسابك الحقيقي من الإعدادات لتفعيل التحويل البنكي");
  }

  await applyBrand(db);

  console.log("\nتم. المتبقي:", {
    منتجات: await db.product.count(),
    تصنيفات: await db.category.count(),
    كوبونات: await db.coupon.count(),
    مناطق_شحن: await db.shippingZone.count(),
  });
}

main()
  .catch((e) => {
    console.error("فشل:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
