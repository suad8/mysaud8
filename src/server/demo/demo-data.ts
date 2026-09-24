/**
 * معرّفات بيانات العرض التجريبي التي يضيفها prisma/seed.ts (متجر القهوة القديم).
 * ملف نقي بلا استيرادات — يستخدمه زر "حذف البيانات التجريبية" وسكربتات prisma معاً.
 * أي منتج/عميل لا يطابق هذه المعرّفات بالضبط يُعد بيانات حقيقية ولا يُمس.
 */
export const DEMO_PRODUCT_SLUGS = [
  "ethiopia-yirgacheffe", "colombia-huila", "brazil-santos", "kenya-aa", "finjan-blend",
  "ceremonial-matcha", "culinary-matcha", "matcha-latte-mix", "hojicha-powder", "v60-dripper",
  "gooseneck-kettle", "matcha-whisk", "matcha-bowl", "hand-grinder", "digital-scale",
  "vanilla-syrup", "salted-caramel-syrup", "oat-milk-barista", "gift-morning-ritual", "gift-matcha-world",
];
export const DEMO_CATEGORY_SLUGS = ["coffee-beans", "matcha", "brewing", "ready-to-drink", "gifts"];
export const DEMO_COUPON_CODES = ["WELCOME10", "FREESHIP", "SAVE30"];
export const DEMO_CUSTOMER_EMAILS = ["sara@example.com", "mohammed@example.com", "noura@example.com", "abdullah@example.com", "reem@example.com"];
export const DEMO_IBAN = "SA44 2000 0001 2345 6789 1234";
