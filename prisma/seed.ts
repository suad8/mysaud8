import { PrismaClient, ProductStatus, OrderStatus, PaymentMethod, PaymentStatus, DiscountType, AdminRole } from "@prisma/client";
import { hashPassword } from "../src/server/auth/password";
import { assertDestructiveAllowed } from "./guard";

const db = new PrismaClient();

// حساب المالك يُنشأ فقط إن مُرِّرت بياناته عبر البيئة (OWNER_EMAIL/OWNER_PASSWORD)
// — لا كلمة مرور افتراضية في الكود لأن المستودع عام.
const OWNER_EMAIL = (process.env.OWNER_EMAIL ?? "").trim().toLowerCase();
const OWNER_PASSWORD = process.env.OWNER_PASSWORD ?? "";

// كتالوج تجريبي لمتجر "فنجان" — قهوة مختصة وماتشا فاخرة وأدوات تحضير.
const CATEGORIES = [
  { slug: "coffee-beans", nameAr: "حبوب القهوة", nameEn: "Coffee Beans", descAr: "حبوب مختصة تُحمَّص أسبوعياً من أصول مختارة." },
  { slug: "matcha", nameAr: "الماتشا", nameEn: "Matcha", descAr: "ماتشا يابانية أصلية بدرجات طقوسية وطهي." },
  { slug: "brewing", nameAr: "أدوات التحضير", nameEn: "Brewing", descAr: "كل ما تحتاجه لتحضير فنجان مثالي في بيتك." },
  { slug: "ready-to-drink", nameAr: "المشروبات الجاهزة", nameEn: "Ready to Drink", descAr: "شرابات وحليب بارستا لإضافة لمسة احترافية." },
  { slug: "gifts", nameAr: "الهدايا", nameEn: "Gifts", descAr: "علب مختارة وجاهزة لعشّاق القهوة والماتشا." },
];

type Seed = {
  slug: string; nameAr: string; shortDescAr: string; descAr: string;
  cat: string; price: number; compare?: number; cost: number;
  img: string; featured?: boolean; stock: number;
  variants?: { nameAr: string; sku: string; options: Record<string, string>; price: number }[];
};

const PRODUCTS: Seed[] = [
  // ── حبوب القهوة ─────────────────────────────────────────
  { slug: "ethiopia-yirgacheffe", nameAr: "إثيوبيا يرغاشيفي", shortDescAr: "نوتات توت وياسمين", cat: "coffee-beans", price: 68, cost: 26, img: "ethiopia-yirgacheffe", featured: true, stock: 96,
    descAr: "حبوب من منطقة يرغاشيفي، معالجة مغسولة بحموضة زاهية ونكهة زهرية. مثالية للتقطير اليدوي.",
    variants: [
      { nameAr: "٢٥٠ جم", sku: "ETH-250", options: { الوزن: "٢٥٠ جم" }, price: 68 },
      { nameAr: "١ كجم", sku: "ETH-1000", options: { الوزن: "١ كجم" }, price: 240 },
    ] },
  { slug: "colombia-huila", nameAr: "كولومبيا هويلا", shortDescAr: "كراميل وبندق", cat: "coffee-beans", price: 62, cost: 24, img: "colombia-huila", stock: 58,
    descAr: "تحميص متوسط بجسم متوازن ونكهات كراميل وبندق. خيار ممتاز للإسبريسو والحليب." },
  { slug: "brazil-santos", nameAr: "البرازيل سانتوس", shortDescAr: "شوكولاتة وحموضة منخفضة", cat: "coffee-beans", price: 59, compare: 72, cost: 22, img: "brazil-santos", stock: 3,
    descAr: "جسم ثقيل وحموضة منخفضة، بنكهة شوكولاتة داكنة. الخيار الأنسب للإسبريسو." },
  { slug: "kenya-aa", nameAr: "كينيا AA", shortDescAr: "توت وحموضة نبيذية", cat: "coffee-beans", price: 75, cost: 29, img: "kenya-aa", featured: true, stock: 41,
    descAr: "من أجود درجات التصنيف الكيني، بحموضة نبيذية مميزة ونكهة توت داكن." },
  { slug: "finjan-blend", nameAr: "مزيج فنجان الخاص", shortDescAr: "توقيعنا الخاص للإسبريسو", cat: "coffee-beans", price: 65, cost: 25, img: "finjan-blend", featured: true, stock: 120,
    descAr: "مزيج حصري من ثلاث أصول مختارة، صُمم خصيصاً ليعطي طبقة كريما غنية وتوازناً مثالياً.",
    variants: [
      { nameAr: "حبوب كاملة", sku: "FNJ-WHOLE", options: { الطحن: "حبوب كاملة" }, price: 65 },
      { nameAr: "مطحون إسبريسو", sku: "FNJ-GROUND", options: { الطحن: "مطحون إسبريسو" }, price: 65 },
    ] },

  // ── الماتشا ─────────────────────────────────────────────
  { slug: "ceremonial-matcha", nameAr: "ماتشا طقوسية درجة أولى", shortDescAr: "للاستمتاع بها صافية", cat: "matcha", price: 165, cost: 68, img: "ceremonial-matcha", featured: true, stock: 34,
    descAr: "أوراق مطحونة حجرياً من أوجي اليابانية، بلون أخضر زاهٍ وطعم حلو مركّز بلا مرارة. تُحضّر بالماء فقط.",
    variants: [
      { nameAr: "٣٠ جم", sku: "MAT-CER-30", options: { الحجم: "٣٠ جم" }, price: 165 },
      { nameAr: "٨٠ جم", sku: "MAT-CER-80", options: { الحجم: "٨٠ جم" }, price: 380 },
    ] },
  { slug: "culinary-matcha", nameAr: "ماتشا طهي", shortDescAr: "مثالية للاتيه والحلويات", cat: "matcha", price: 95, cost: 38, img: "culinary-matcha", stock: 52,
    descAr: "نكهة أقوى تصمد أمام الحليب والسكر — الخيار الأفضل لماتشا لاتيه أو الخبز والحلويات." },
  { slug: "matcha-latte-mix", nameAr: "خليط ماتشا لاتيه", shortDescAr: "جاهز بثوانٍ مع الحليب البارد", cat: "matcha", price: 78, cost: 30, img: "matcha-latte-mix", stock: 45,
    descAr: "ماتشا مع قليل من السكر المهروس، تُحضَّر بالهزّ مع الحليب البارد أو الساخن دون تكتّل." },
  { slug: "hojicha-powder", nameAr: "هوجيتشا مطحونة", shortDescAr: "شاي أخضر محمّص بنكهة دافئة", cat: "matcha", price: 88, cost: 34, img: "hojicha-powder", stock: 5,
    descAr: "أوراق شاي محمّصة بنكهة كراميلية دافئة وكافيين أقل من الماتشا التقليدية." },

  // ── أدوات التحضير ────────────────────────────────────────
  { slug: "v60-dripper", nameAr: "قمع تقطير V60", shortDescAr: "سيراميك بحجم ٠٢", cat: "brewing", price: 145, cost: 58, img: "v60-dripper", stock: 27,
    descAr: "قمع سيراميك يحتفظ بالحرارة ويمنح تدفقاً متزناً. يتسع لكوبين." },
  { slug: "gooseneck-kettle", nameAr: "غلاية عنق البجعة", shortDescAr: "تحكم دقيق بالحرارة", cat: "brewing", price: 385, compare: 449, cost: 160, img: "gooseneck-kettle", featured: true, stock: 14,
    descAr: "غلاية كهربائية ١ لتر مع شاشة حرارة ومؤقت. فوهة رفيعة لصب دقيق يناسب القهوة والماتشا." },
  { slug: "matcha-whisk", nameAr: "مضرب الماتشا (تشاسن)", shortDescAr: "خيزران طبيعي ١٠٠ شعرة", cat: "brewing", price: 120, cost: 45, img: "matcha-whisk", featured: true, stock: 39,
    descAr: "مصنوع يدوياً من خيزران طبيعي، يمنح رغوة ناعمة ومتجانسة بلا تكتّل." },
  { slug: "matcha-bowl", nameAr: "طاسة الماتشا (تشاوان)", shortDescAr: "سيراميك ياباني الصنع", cat: "brewing", price: 95, cost: 37, img: "matcha-bowl", stock: 22,
    descAr: "شكل واسع يسهّل الخفق، بسمك يحافظ على حرارة المشروب لفترة أطول." },
  { slug: "hand-grinder", nameAr: "مطحنة يدوية", shortDescAr: "شفرات سيراميك قابلة للضبط", cat: "brewing", price: 210, compare: 249, cost: 88, img: "hand-grinder", stock: 18,
    descAr: "مطحنة محمولة بشفرات سيراميك دقيقة، تعطي طحناً متجانساً لكل طرق التحضير." },
  { slug: "digital-scale", nameAr: "ميزان تحضير رقمي", shortDescAr: "بمؤقت مدمج ودقة 0.1 جم", cat: "brewing", price: 175, cost: 70, img: "digital-scale", stock: 0,
    descAr: "أساسي لضبط نسبة الماء إلى القهوة أو الماتشا بدقة، مع مؤقت مدمج وشاشة مقاومة للماء." },

  // ── المشروبات الجاهزة ────────────────────────────────────
  { slug: "vanilla-syrup", nameAr: "شراب الفانيليا الطبيعي", shortDescAr: "بدون ألوان صناعية", cat: "ready-to-drink", price: 45, cost: 17, img: "vanilla-syrup", stock: 63,
    descAr: "شراب مركّز من فانيليا مدغشقر الطبيعية، يناسب القهوة الباردة والساخنة." },
  { slug: "salted-caramel-syrup", nameAr: "شراب الكراميل المملح", shortDescAr: "توازن حلو ومالح", cat: "ready-to-drink", price: 45, cost: 17, img: "vanilla-syrup", stock: 41,
    descAr: "كراميل مطبوخ ببطء مع لمسة ملح البحر — إضافة مثالية للاتيه." },
  { slug: "oat-milk-barista", nameAr: "حليب شوفان بارستا", shortDescAr: "يرغّي مثل الحليب الحيواني", cat: "ready-to-drink", price: 32, cost: 14, img: "oat-milk-barista", stock: 0,
    descAr: "تركيبة مخصوصة للبارستا، تعطي رغوة كثيفة ومستقرة مع القهوة والماتشا." },

  // ── الهدايا ──────────────────────────────────────────────
  { slug: "gift-morning-ritual", nameAr: "علبة هدية — طقس الصباح", shortDescAr: "حبوب + قمع تقطير + كوب", cat: "gifts", price: 265, compare: 320, cost: 108, img: "gift-morning-ritual", featured: true, stock: 21,
    descAr: "تضم ٢٥٠ جم من مزيج فنجان، قمع تقطير V60، وكوب سيراميك، في علبة مغلّفة مع بطاقة إهداء." },
  { slug: "gift-matcha-world", nameAr: "علبة هدية — عالم الماتشا", shortDescAr: "ماتشا طقوسية + مضرب + طاسة", cat: "gifts", price: 320, featured: true, cost: 130, img: "gift-matcha-world", stock: 16,
    descAr: "كل ما يحتاجه المبتدئ لبدء طقس الماتشا الخاص به، في علبة أنيقة جاهزة للإهداء." },
];

async function main() {
  assertDestructiveAllowed("db:seed");
  console.log("🧹 تنظيف البيانات السابقة…");
  await db.$transaction([
    db.orderEvent.deleteMany(), db.payment.deleteMany(), db.shipment.deleteMany(),
    db.orderItem.deleteMany(), db.order.deleteMany(),
    db.cartItem.deleteMany(), db.cart.deleteMany(),
    db.inventoryMovement.deleteMany(), db.inventoryItem.deleteMany(),
    db.review.deleteMany(), db.wishlistItem.deleteMany(),
    db.productImage.deleteMany(), db.productVariant.deleteMany(), db.product.deleteMany(),
    db.category.deleteMany(), db.brand.deleteMany(),
    db.address.deleteMany(), db.customer.deleteMany(),
    db.coupon.deleteMany(), db.shippingRate.deleteMany(), db.shippingZone.deleteMany(),
    db.auditLog.deleteMany(),
    // ⚠️ عمداً لا نحذف adminUser ولا setting هنا: تحتوي كلمة مرور حقيقية
    // وإعدادات دفع حقيقية (بيانات الحساب البنكي) قد يكون المستخدم غيّرها
    // من لوحة التحكم — إعادة تشغيل هذا السكريبت لتحديث الكتالوج التجريبي
    // يجب ألا يمسح حساب الدخول أو الإعدادات الحقيقية.
  ]);

  console.log("📁 التصنيفات…");
  const cats = new Map<string, string>();
  for (const [i, c] of CATEGORIES.entries()) {
    const row = await db.category.create({ data: { ...c, position: i, isActive: true } });
    cats.set(c.slug, row.id);
  }

  console.log("📦 المنتجات…");
  const variantIds: string[] = [];
  for (const p of PRODUCTS) {
    const product = await db.product.create({
      data: {
        slug: p.slug, nameAr: p.nameAr, shortDescAr: p.shortDescAr, descAr: p.descAr,
        categoryId: cats.get(p.cat)!, status: ProductStatus.ACTIVE, isFeatured: p.featured ?? false,
        basePrice: p.price, comparePrice: p.compare ?? null, costPrice: p.cost,
        metaTitle: p.nameAr, metaDesc: p.shortDescAr,
        images: { create: [{ url: `/products/${p.img}.svg`, alt: p.nameAr, position: 0 }] },
      },
    });

    const defs = p.variants ?? [{ nameAr: "الافتراضي", sku: p.slug.toUpperCase().slice(0, 12), options: {}, price: p.price }];
    for (const [i, v] of defs.entries()) {
      // نوزّع المخزون على المتغيّرات بدل تكراره لكل واحد
      const qty = Math.max(0, Math.round(p.stock / defs.length) + (i === 0 ? p.stock % defs.length : 0));
      const variant = await db.productVariant.create({
        data: {
          productId: product.id, sku: v.sku, nameAr: v.nameAr, options: v.options, price: v.price,
          comparePrice: p.compare && i === 0 ? p.compare : null,
          inventory: { create: { onHand: qty, reserved: 0, lowStockAt: 5 } },
        },
      });
      variantIds.push(variant.id);
    }
  }

  console.log("🚚 مناطق الشحن…");
  const zone = await db.shippingZone.create({
    data: { nameAr: "المدن الرئيسية", cities: ["الرياض", "جدة", "الدمام", "مكة المكرمة", "المدينة المنورة"] },
  });
  await db.shippingRate.createMany({
    data: [
      { zoneId: zone.id, nameAr: "توصيل عادي", price: 20, freeAbove: 200, minDays: 2, maxDays: 4 },
      { zoneId: zone.id, nameAr: "توصيل سريع", price: 40, minDays: 1, maxDays: 1 },
    ],
  });

  console.log("🎟️  الكوبونات…");
  await db.coupon.createMany({
    data: [
      { code: "WELCOME10", type: DiscountType.PERCENTAGE, value: 10, minSubtotal: 100, maxDiscount: 80, usageLimit: 500, isActive: true },
      { code: "FREESHIP", type: DiscountType.FREE_SHIPPING, value: 0, minSubtotal: 150, isActive: true },
      { code: "SAVE30", type: DiscountType.FIXED, value: 30, minSubtotal: 250, usageLimit: 100, usageCount: 37, isActive: true },
    ],
  });

  console.log("👥 العملاء والطلبات…");
  const people = [
    { name: "سارة العتيبي", email: "sara@example.com", phone: "+966501234567", city: "الرياض" },
    { name: "محمد الشهري", email: "mohammed@example.com", phone: "+966502345678", city: "جدة" },
    { name: "نورة القحطاني", email: "noura@example.com", phone: "+966503456789", city: "الدمام" },
    { name: "عبدالله الحربي", email: "abdullah@example.com", phone: "+966504567890", city: "الرياض" },
    { name: "ريم الزهراني", email: "reem@example.com", phone: "+966505678901", city: "مكة المكرمة" },
  ];

  const statuses = [OrderStatus.DELIVERED, OrderStatus.SHIPPED, OrderStatus.PROCESSING, OrderStatus.PAID, OrderStatus.PENDING, OrderStatus.CANCELLED];
  let orderNo = 1000;

  for (const [pi, person] of people.entries()) {
    const customer = await db.customer.create({
      data: {
        name: person.name, email: person.email, phone: person.phone, acceptsMarketing: pi % 2 === 0,
        addresses: { create: { name: person.name, phone: person.phone, city: person.city, district: "حي النخيل", street: "طريق الملك عبدالعزيز", isDefault: true } },
      },
    });

    for (let o = 0; o < 3; o++) {
      const status = statuses[(pi + o) % statuses.length];
      const picked = PRODUCTS.slice((pi + o) % 12, ((pi + o) % 12) + 2);
      const items = picked.map((p) => ({ nameAr: p.nameAr, sku: p.slug.toUpperCase().slice(0, 12), imageUrl: `/products/${p.img}.svg`, unitPrice: p.price, quantity: 1 + ((pi + o) % 2), lineTotal: p.price * (1 + ((pi + o) % 2)) }));
      const subtotal = items.reduce((s, i) => s + i.lineTotal, 0);
      const shipping = subtotal >= 200 ? 0 : 20;
      const grand = subtotal + shipping;
      const daysAgo = (pi * 3 + o) * 2 + 1;
      const placedAt = new Date(Date.now() - daysAgo * 86_400_000);
      const paid = status !== OrderStatus.PENDING && status !== OrderStatus.CANCELLED;

      await db.order.create({
        data: {
          number: `FJ-${++orderNo}`, customerId: customer.id, status,
          email: person.email, phone: person.phone,
          shipToName: person.name, shipToCity: person.city, shipToDistrict: "حي النخيل", shipToStreet: "طريق الملك عبدالعزيز",
          subtotal, shippingTotal: shipping, taxTotal: Math.round(grand * (0.15 / 1.15) * 100) / 100, grandTotal: grand,
          placedAt, paidAt: paid ? placedAt : null,
          items: { create: items },
          payments: paid ? { create: { provider: "moyasar", providerRef: `pay_${orderNo}`, method: o % 2 === 0 ? PaymentMethod.MADA : PaymentMethod.APPLE_PAY, amount: grand, status: PaymentStatus.CAPTURED } } : undefined,
          events: { create: { message: "تم استلام الطلب", status: OrderStatus.PENDING, createdAt: placedAt } },
        },
      });
    }
  }

  console.log("⭐ التقييمات…");
  const allProducts = await db.product.findMany({ select: { id: true } });
  const comments = ["نكهة رائعة ووصلت طازجة، سأكرر الطلب بالتأكيد.", "جودة تستحق السعر، ألاحظ فرقاً واضحاً عن غيرها.", "جيد جداً، التغليف حافظ عليها بحالة ممتازة.", "من أفضل ما جربت، أنصح به بشدة."];
  for (const [i, p] of allProducts.entries()) {
    await db.review.create({
      data: { productId: p.id, authorName: people[i % people.length].name, rating: 4 + (i % 2), comment: comments[i % comments.length], isApproved: true },
    });
  }

  console.log("⚙️  المستخدم الإداري والإعدادات (بدون استبدال بيانات حقيقية موجودة)…");
  const existingOwner = OWNER_EMAIL ? await db.adminUser.findUnique({ where: { email: OWNER_EMAIL } }) : null;
  if (existingOwner) {
    console.log(`   ↳ حساب المالك موجود مسبقاً (${OWNER_EMAIL}) — لم تُغيَّر كلمة المرور`);
  } else if (OWNER_EMAIL && OWNER_PASSWORD.length >= 12) {
    await db.adminUser.create({
      data: {
        email: OWNER_EMAIL,
        name: "مدير المتجر",
        role: AdminRole.OWNER,
        passwordHash: await hashPassword(OWNER_PASSWORD),
      },
    });
    console.log(`   ↳ حساب مالك جديد: ${OWNER_EMAIL}`);
  } else {
    console.log("   ↳ لم يُنشأ حساب مالك — شغّل npm run db:create-owner مع OWNER_EMAIL و OWNER_PASSWORD");
  }

  await db.setting.createMany({
    skipDuplicates: true,
    data: [
      { key: "store.name", value: "فنجان" },
      { key: "store.tagline", value: "قهوة مختصة وماتشا فاخرة" },
      { key: "tax.rate", value: 0.15 },
      { key: "shipping.freeAbove", value: 200 },
      {
        key: "payment.bankTransfer",
        value: {
          enabled: true,
          bankName: "البنك الأهلي السعودي",
          accountName: "شركة فنجان للتجارة",
          iban: "SA44 2000 0001 2345 6789 1234",
          accountNumber: "12345678901234",
        },
      },
      {
        key: "payment.moyasar",
        value: { enabled: false, publishableKey: "", secretKey: "" },
      },
    ],
  });

  const counts = {
    تصنيفات: await db.category.count(), منتجات: await db.product.count(),
    متغيّرات: await db.productVariant.count(), عملاء: await db.customer.count(),
    طلبات: await db.order.count(), تقييمات: await db.review.count(),
  };
  console.log("✅ تمت التعبئة:", counts);
}

main()
  .catch((e) => { console.error("❌ فشلت التعبئة:", e); process.exit(1); })
  .finally(() => db.$disconnect());
