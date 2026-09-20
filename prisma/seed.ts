import { PrismaClient, ProductStatus, OrderStatus, PaymentMethod, PaymentStatus, DiscountType, AdminRole } from "@prisma/client";

const db = new PrismaClient();

// كتالوج تجريبي لمتجر "نسيم" — عناية، عطور، قهوة، منزل.
const CATEGORIES = [
  { slug: "skincare", nameAr: "العناية بالبشرة", nameEn: "Skincare", descAr: "روتين يومي بمكوّنات نظيفة ونتائج ملموسة." },
  { slug: "fragrance", nameAr: "العطور", nameEn: "Fragrance", descAr: "عود ومسك وورد بتركيبات شرقية معاصرة." },
  { slug: "coffee", nameAr: "القهوة المختصة", nameEn: "Coffee", descAr: "حبوب محمّصة طازجة وأدوات تحضير." },
  { slug: "home", nameAr: "المنزل", nameEn: "Home", descAr: "تفاصيل تصنع دفء المكان." },
  { slug: "gifts", nameAr: "الهدايا", nameEn: "Gifts", descAr: "علب مختارة وجاهزة للإهداء." },
];

type Seed = {
  slug: string; nameAr: string; shortDescAr: string; descAr: string;
  cat: string; price: number; compare?: number; cost: number;
  img: string; featured?: boolean; stock: number;
  variants?: { nameAr: string; sku: string; options: Record<string, string>; price: number }[];
};

const PRODUCTS: Seed[] = [
  { slug: "vitamin-c-serum", nameAr: "سيروم فيتامين سي المركّز", shortDescAr: "يوحّد لون البشرة ويمنحها إشراقاً", cat: "skincare", price: 189, compare: 235, cost: 72, img: "serum", featured: true, stock: 48,
    descAr: "تركيبة بنسبة ١٥٪ من فيتامين سي الثابت مع حمض الهيالورونيك. يُستخدم صباحاً على بشرة نظيفة قبل واقي الشمس." },
  { slug: "night-repair-cream", nameAr: "كريم الترميم الليلي", shortDescAr: "يعمل أثناء النوم على ترطيب عميق", cat: "skincare", price: 245, cost: 95, img: "cream", featured: true, stock: 32,
    descAr: "كريم غني بالسيراميد وزبدة الشيا، يدعم حاجز البشرة ويقلل الجفاف عند الاستيقاظ.",
    variants: [
      { nameAr: "٣٠ مل", sku: "NRC-30", options: { "الحجم": "٣٠ مل" }, price: 245 },
      { nameAr: "٥٠ مل", sku: "NRC-50", options: { "الحجم": "٥٠ مل" }, price: 345 },
    ] },
  { slug: "gentle-cleanser", nameAr: "غسول لطيف للوجه", shortDescAr: "ينظّف دون أن يجفّف", cat: "skincare", price: 112, compare: 130, cost: 41, img: "cleanser", stock: 74,
    descAr: "رغوة خفيفة خالية من الكبريتات، مناسبة للاستخدام اليومي ولجميع أنواع البشرة." },
  { slug: "clay-mask", nameAr: "ماسك الطين المنقّي", shortDescAr: "يشدّ المسام ويمتص الزيوت", cat: "skincare", price: 98, cost: 33, img: "mask", stock: 5,
    descAr: "طين أخضر مغربي مع زيت شجرة الشاي. يُستخدم مرتين أسبوعياً لمدة ١٠ دقائق." },

  { slug: "oud-royal", nameAr: "عطر عود رويال", shortDescAr: "عود كمبودي مع عنبر ومسك", cat: "fragrance", price: 620, compare: 780, cost: 245, img: "oud", featured: true, stock: 18,
    descAr: "عطر شرقي فاخر يفتح بالزعفران ويستقر على قاعدة من العود والعنبر. ثبات يتجاوز ١٠ ساعات.",
    variants: [
      { nameAr: "٥٠ مل", sku: "OUD-50", options: { "الحجم": "٥٠ مل" }, price: 620 },
      { nameAr: "١٠٠ مل", sku: "OUD-100", options: { "الحجم": "١٠٠ مل" }, price: 940 },
    ] },
  { slug: "white-musk", nameAr: "مسك أبيض", shortDescAr: "نقاء هادئ للاستخدام اليومي", cat: "fragrance", price: 285, cost: 98, img: "musk", stock: 41,
    descAr: "مسك أبيض ناعم مع لمسة من زهر البرتقال. خفيف ومناسب للعمل والأجواء النهارية." },
  { slug: "taif-rose", nameAr: "ورد الطائف", shortDescAr: "ورد طبيعي مقطّر", cat: "fragrance", price: 430, cost: 165, img: "rose", featured: true, stock: 23,
    descAr: "مستخلص من ورد الطائف البلدي بطريقة التقطير التقليدية، معبّأ في زجاجة بغطاء نحاسي." },

  { slug: "ethiopia-light", nameAr: "حبوب إثيوبيا — تحميص فاتح", shortDescAr: "نوتات توت وياسمين", cat: "coffee", price: 68, cost: 26, img: "coffee-light", featured: true, stock: 96,
    descAr: "حبوب من منطقة يرغاشيفي، معالجة بالطريقة المغسولة. مثالية للتقطير والV60.",
    variants: [
      { nameAr: "٢٥٠ جم", sku: "ETH-250", options: { "الوزن": "٢٥٠ جم" }, price: 68 },
      { nameAr: "١ كجم", sku: "ETH-1000", options: { "الوزن": "١ كجم" }, price: 240 },
    ] },
  { slug: "brazil-dark", nameAr: "حبوب البرازيل — تحميص غامق", shortDescAr: "شوكولاتة وبندق", cat: "coffee", price: 59, compare: 72, cost: 22, img: "coffee-dark", stock: 3,
    descAr: "جسم ثقيل وحموضة منخفضة. الخيار الأنسب للإسبريسو والحليب." },
  { slug: "v60-dripper", nameAr: "قمع تقطير V60", shortDescAr: "سيراميك بحجم ٠٢", cat: "coffee", price: 145, cost: 58, img: "dripper", stock: 27,
    descAr: "قمع سيراميك يحتفظ بالحرارة ويمنح تدفقاً متزناً. يتسع لكوبين." },
  { slug: "gooseneck-kettle", nameAr: "غلاية عنق البجعة", shortDescAr: "تحكم دقيق بالحرارة", cat: "coffee", price: 385, compare: 449, cost: 160, img: "kettle", featured: true, stock: 14,
    descAr: "غلاية كهربائية ١ لتر مع شاشة حرارة ومؤقت. فوهة رفيعة لصب دقيق." },

  { slug: "amber-candle", nameAr: "شمعة العنبر", shortDescAr: "شمع صويا يدوم ٤٥ ساعة", cat: "home", price: 135, cost: 44, img: "candle", stock: 52,
    descAr: "شمع صويا طبيعي بفتيلة قطنية، برائحة العنبر وخشب الصندل، في كوب زجاجي قابل لإعادة الاستخدام." },
  { slug: "reed-diffuser", nameAr: "معطّر أعواد", shortDescAr: "عطر مستمر بلا لهب", cat: "home", price: 165, cost: 62, img: "diffuser", stock: 38,
    descAr: "زيت عطري ٢٠٠ مل مع ٨ أعواد روطان. يعطّر الغرفة حتى ٣ أشهر." },
  { slug: "cotton-towel", nameAr: "منشفة قطن مصري", shortDescAr: "امتصاص عالٍ وملمس ناعم", cat: "home", price: 89, cost: 31, img: "towel", stock: 0,
    descAr: "قطن مصري ٦٠٠ جرام/م². متوفرة بثلاثة ألوان محايدة.",
    variants: [
      { nameAr: "رمادي", sku: "TWL-GRY", options: { "اللون": "رمادي" }, price: 89 },
      { nameAr: "بيج", sku: "TWL-BEG", options: { "اللون": "بيج" }, price: 89 },
    ] },
  { slug: "ceramic-mug", nameAr: "كوب سيراميك يدوي", shortDescAr: "٣٠٠ مل بتشطيب مطفي", cat: "home", price: 72, cost: 24, img: "mug", stock: 64,
    descAr: "مصنوع يدوياً، لذلك يختلف كل كوب قليلاً عن الآخر. آمن في غسالة الصحون." },
  { slug: "serving-tray", nameAr: "صينية تقديم خشبية", shortDescAr: "خشب جوز بمقابض نحاسية", cat: "home", price: 210, cost: 84, img: "tray", stock: 19,
    descAr: "خشب جوز مصقول بزيت طبيعي، بمقاس ٤٥×٣٠ سم." },

  { slug: "gift-box-coffee", nameAr: "علبة هدية — ركن القهوة", shortDescAr: "حبوب + قمع + كوب", cat: "gifts", price: 265, compare: 320, cost: 108, img: "giftbox", featured: true, stock: 21,
    descAr: "تضم ٢٥٠ جم حبوب إثيوبيا، قمع تقطير، وكوب سيراميك، في علبة مغلّفة مع بطاقة إهداء." },
  { slug: "gift-box-care", nameAr: "علبة هدية — العناية", shortDescAr: "سيروم + كريم + صابون", cat: "gifts", price: 395, cost: 155, img: "soap", stock: 16,
    descAr: "مجموعة عناية كاملة في علبة أنيقة مع بطاقة مكتوبة بخط اليد." },
];

async function main() {
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
    db.auditLog.deleteMany(), db.adminUser.deleteMany(), db.setting.deleteMany(),
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
      { zoneId: zone.id, nameAr: "توصيل عادي", price: 25, freeAbove: 300, minDays: 2, maxDays: 4 },
      { zoneId: zone.id, nameAr: "توصيل سريع", price: 45, minDays: 1, maxDays: 1 },
    ],
  });

  console.log("🎟️  الكوبونات…");
  await db.coupon.createMany({
    data: [
      { code: "WELCOME10", type: DiscountType.PERCENTAGE, value: 10, minSubtotal: 150, maxDiscount: 100, usageLimit: 500, isActive: true },
      { code: "FREESHIP", type: DiscountType.FREE_SHIPPING, value: 0, minSubtotal: 200, isActive: true },
      { code: "SAVE50", type: DiscountType.FIXED, value: 50, minSubtotal: 400, usageLimit: 100, usageCount: 37, isActive: true },
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
      const shipping = subtotal >= 300 ? 0 : 25;
      const grand = subtotal + shipping;
      const daysAgo = (pi * 3 + o) * 2 + 1;
      const placedAt = new Date(Date.now() - daysAgo * 86_400_000);
      const paid = status !== OrderStatus.PENDING && status !== OrderStatus.CANCELLED;

      await db.order.create({
        data: {
          number: `NS-${++orderNo}`, customerId: customer.id, status,
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
  const comments = ["منتج ممتاز، وصل بسرعة والتغليف أنيق.", "جودة تستحق السعر، سأكرر الطلب.", "جيد لكن توقعت الحجم أكبر.", "رائع جداً، أنصح به."];
  for (const [i, p] of allProducts.entries()) {
    await db.review.create({
      data: { productId: p.id, authorName: people[i % people.length].name, rating: 4 + (i % 2), comment: comments[i % comments.length], isApproved: true },
    });
  }

  console.log("⚙️  المستخدم الإداري والإعدادات…");
  await db.adminUser.create({
    data: {
      email: "admin@example.com", name: "مدير المتجر", role: AdminRole.OWNER,
      // كلمة مرور تجريبية للتطوير فقط — تُستبدل بتجزئة Argon2 في المرحلة ٣
      passwordHash: "REPLACE_ME_IN_PHASE_3",
    },
  });
  await db.setting.createMany({
    data: [
      { key: "store.name", value: "نسيم" },
      { key: "store.tagline", value: "عناية وعطور وقهوة" },
      { key: "tax.rate", value: 0.15 },
      { key: "shipping.freeAbove", value: 300 },
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
