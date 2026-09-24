import { db } from "@/server/db";
import { getBankTransferSettings, saveBankTransferSettings } from "@/server/settings";
import {
  DEMO_CATEGORY_SLUGS,
  DEMO_COUPON_CODES,
  DEMO_CUSTOMER_EMAILS,
  DEMO_IBAN,
  DEMO_PRODUCT_SLUGS,
} from "@/server/demo/demo-data";

export type DemoDataSummary = {
  products: number;
  reviews: number;
  customers: number;
  orders: number;
  categories: number;
  coupons: number;
  demoIban: boolean;
  total: number;
};

/** ما تبقّى من بيانات العرض التجريبي — يُطابَق بالمعرّفات المعروفة فقط. */
export async function getDemoDataSummary(): Promise<DemoDataSummary> {
  const demoProducts = { slug: { in: DEMO_PRODUCT_SLUGS }, deletedAt: null };
  const demoCustomers = { email: { in: DEMO_CUSTOMER_EMAILS } };
  const [products, reviews, customers, orders, categories, coupons, bank] = await Promise.all([
    db.product.count({ where: demoProducts }),
    db.review.count({ where: { product: demoProducts } }),
    db.customer.count({ where: demoCustomers }),
    db.order.count({ where: { customer: demoCustomers } }),
    db.category.count({ where: { slug: { in: DEMO_CATEGORY_SLUGS }, isActive: true } }),
    db.coupon.count({ where: { code: { in: DEMO_COUPON_CODES } } }),
    getBankTransferSettings(),
  ]);
  const demoIban = bank.iban === DEMO_IBAN;
  return { products, reviews, customers, orders, categories, coupons, demoIban, total: products + customers + categories + coupons + (demoIban ? 1 : 0) };
}

/**
 * يحذف بيانات العرض التجريبي فقط (منتجات القهوة، تقييماتها، عملاء @example.com
 * وطلباتهم، تصنيفاتها وكوبوناتها، والآيبان الوهمي). لا يمس أي منتج أو طلب حقيقي:
 * منتج تجريبي اشتراه عميل حقيقي يُؤرشف (يختفي من المتجر) بدل حذفه حتى تبقى فاتورته سليمة.
 */
export async function removeDemoData() {
  const demoCustomerIds = (await db.customer.findMany({ where: { email: { in: DEMO_CUSTOMER_EMAILS } }, select: { id: true } })).map((c) => c.id);
  const demoProducts = await db.product.findMany({ where: { slug: { in: DEMO_PRODUCT_SLUGS } }, select: { id: true } });
  const productIds = demoProducts.map((p) => p.id);

  // طلبات العملاء التجريبيين أولاً (بنودها ومدفوعاتها وشحناتها تُحذف معها)
  const ordersDeleted = await db.order.deleteMany({ where: { customerId: { in: demoCustomerIds } } });

  // منتجات تجريبية ما زالت ضمن طلبات حقيقية → أرشفة بدل الحذف
  const referenced = new Set(
    (await db.orderItem.findMany({ where: { productId: { in: productIds } }, select: { productId: true }, distinct: ["productId"] }))
      .map((i) => i.productId)
      .filter((id): id is string => Boolean(id)),
  );
  const deletable = productIds.filter((id) => !referenced.has(id));
  const archivable = productIds.filter((id) => referenced.has(id));

  const [, , productsDeleted, productsArchived, customersDeleted] = await db.$transaction([
    db.cartItem.deleteMany({ where: { productId: { in: productIds } } }),
    db.review.deleteMany({ where: { OR: [{ productId: { in: productIds } }, { customerId: { in: demoCustomerIds } }] } }),
    db.product.deleteMany({ where: { id: { in: deletable } } }),
    db.product.updateMany({ where: { id: { in: archivable } }, data: { status: "ARCHIVED", isFeatured: false, deletedAt: new Date() } }),
    db.customer.deleteMany({ where: { id: { in: demoCustomerIds } } }),
  ]);

  // التصنيفات التجريبية تُحذف فقط إن لم يعد فيها أي منتج (حتى لو أضاف المتجر منتجاته لها)
  const categoriesDeleted = await db.category.deleteMany({ where: { slug: { in: DEMO_CATEGORY_SLUGS }, products: { none: {} } } });
  // تصنيف تجريبي بقي بسبب منتج مؤرشف فقط (بلا منتجات ظاهرة) يُخفى من المتجر
  await db.category.updateMany({
    where: { slug: { in: DEMO_CATEGORY_SLUGS }, products: { none: { deletedAt: null } } },
    data: { isActive: false },
  });
  const couponsDeleted = await db.coupon.deleteMany({ where: { code: { in: DEMO_COUPON_CODES } } });

  const bank = await getBankTransferSettings();
  const ibanCleared = bank.iban === DEMO_IBAN;
  if (ibanCleared) {
    await saveBankTransferSettings({ enabled: false, bankName: "", accountName: "", iban: "", accountNumber: "" });
  }

  return {
    orders: ordersDeleted.count,
    products: productsDeleted.count,
    productsArchived: productsArchived.count,
    customers: customersDeleted.count,
    categories: categoriesDeleted.count,
    coupons: couponsDeleted.count,
    ibanCleared,
  };
}
