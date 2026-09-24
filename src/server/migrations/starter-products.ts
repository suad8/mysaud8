import type { PrismaClient } from "@prisma/client";
import type { CustomFieldDef } from "@/server/products/custom-fields";

/**
 * منتجات المتجر الأولى (طلب المالك) — تُضاف مرة واحدة فقط عند أول تشغيل بعد النشر.
 * بعد التنفيذ يُحفظ علم في الإعدادات فلا تُعاد إضافتها أبداً، حتى لو حُذفت لاحقاً.
 * بلا صور: يضيفها المالك (رفع صورة حقيقية أو توليدها بـ Gemini من صفحة المنتج).
 */
const MIGRATION_KEY = "migration.starterProducts.v1";

type StarterProduct = {
  slug: string;
  sku: string;
  nameAr: string;
  shortDescAr: string;
  descAr: string;
  category: { slug: string; nameAr: string };
  customFields: CustomFieldDef[];
};

const CUPS = { slug: "paper-cups", nameAr: "أكواب ورقية" };
const DISPLAYS = { slug: "display-stands", nameAr: "لوحات إعلانية" };
const LOGO_FIELD: CustomFieldDef = { id: "cf-print-logo", label: "أرفق شعارك للطباعة (اختياري)", type: "FILE", required: false };

const PRODUCTS: StarterProduct[] = [
  {
    slug: "paper-cup-9oz-double-wall",
    sku: "CUP-9OZ-DW",
    nameAr: "كوب 9 أونص ورقي دبل",
    shortDescAr: "كوب ورقي مزدوج الجدار للمشروبات الساخنة — سعة 9 أونص",
    descAr:
      "كوب ورقي بجدار مزدوج (دبل) سعة 9 أونص (حوالي 265 مل). الجدار المزدوج يعزل الحرارة فيبقى المشروب ساخناً والكوب مريحاً في اليد دون غلاف إضافي. مناسب للمقاهي والمطاعم والفعاليات، ويمكن طباعة شعارك عليه.",
    category: CUPS,
    customFields: [LOGO_FIELD],
  },
  {
    slug: "paper-cup-8oz-double-wall",
    sku: "CUP-8OZ-DW",
    nameAr: "كوب 8 أونص ورقي دبل",
    shortDescAr: "كوب ورقي مزدوج الجدار للمشروبات الساخنة — سعة 8 أونص",
    descAr:
      "كوب ورقي بجدار مزدوج (دبل) سعة 8 أونص (حوالي 240 مل). الجدار المزدوج يعزل الحرارة فيبقى المشروب ساخناً والكوب مريحاً في اليد دون غلاف إضافي. مناسب للقهوة المختصة والمشروبات الساخنة، ويمكن طباعة شعارك عليه.",
    category: CUPS,
    customFields: [LOGO_FIELD],
  },
  {
    slug: "roll-up-85x200",
    sku: "ROLLUP-85X200",
    nameAr: "رول أب",
    shortDescAr: "استاند رول أب إعلاني مطبوع بتصميمك — 85×200 سم",
    descAr:
      "استاند رول أب إعلاني بالمقاس القياسي 85×200 سم، مطبوع بتصميمك بألوان واضحة. سهل التركيب والنقل، مناسب للمعارض والفعاليات وواجهات المحلات.",
    category: DISPLAYS,
    customFields: [
      { id: "cf-rollup-design", label: "أرفق تصميمك", type: "FILE", required: false },
      { id: "cf-rollup-notes", label: "ملاحظات على التصميم (اختياري)", type: "TEXTAREA", required: false },
    ],
  },
];

const PRICE = 1;
const STOCK = 100;

export async function addStarterProducts(db: PrismaClient) {
  if (await db.setting.findUnique({ where: { key: MIGRATION_KEY } })) return;

  const created: string[] = [];
  for (const p of PRODUCTS) {
    if (await db.product.findUnique({ where: { slug: p.slug }, select: { id: true } })) continue;
    const category = await db.category.upsert({
      where: { slug: p.category.slug },
      create: { slug: p.category.slug, nameAr: p.category.nameAr, isActive: true },
      update: {},
    });
    await db.product.create({
      data: {
        slug: p.slug,
        nameAr: p.nameAr,
        shortDescAr: p.shortDescAr,
        descAr: p.descAr,
        metaTitle: p.nameAr,
        metaDesc: p.shortDescAr,
        status: "ACTIVE",
        isFeatured: true,
        basePrice: PRICE,
        categoryId: category.id,
        customFields: p.customFields,
        variants: {
          create: [{ sku: p.sku, nameAr: "الافتراضي", options: {}, price: PRICE, inventory: { create: { onHand: STOCK, reserved: 0, lowStockAt: 5 } } }],
        },
      },
    });
    created.push(p.slug);
  }

  await db.setting.create({ data: { key: MIGRATION_KEY, value: { appliedAt: new Date().toISOString(), created } } });
  console.log(`[migrations] starter products added: ${created.join(", ") || "none (already present)"}`);
}
