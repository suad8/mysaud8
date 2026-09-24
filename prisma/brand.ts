import type { PrismaClient, Prisma } from "@prisma/client";

/** هوية "الورقة الذهبية" — تُطبَّق على إعدادات محفوظة سابقاً دون حذف صورة البانر أو بيانات التواصل. */
export const BRAND = {
  name: "الورقة الذهبية",
  tagline: "حلول طباعة احترافية بجودة ذهبية",
  logoUrl: "/brand/mark.png",
  primaryColor: "#663dff",
  accentColor: "#ffc430",
};

async function readValue(db: PrismaClient, key: string): Promise<Record<string, unknown> | null> {
  const row = await db.setting.findUnique({ where: { key } });
  return row ? (row.value as Record<string, unknown>) : null;
}

export async function writeSetting(db: PrismaClient, key: string, value: Record<string, unknown>) {
  const json = value as Prisma.InputJsonValue;
  await db.setting.upsert({ where: { key }, create: { key, value: json }, update: { value: json } });
}

export async function applyBrand(db: PrismaClient) {
  const info = (await readValue(db, "store.info")) ?? {};
  await writeSetting(db, "store.info", { ...info, name: BRAND.name, tagline: BRAND.tagline, logoUrl: BRAND.logoUrl });
  console.log("✓ اسم المتجر والشعار");

  // نصوص البانر القديمة تُزال لتظهر نصوص الهوية الافتراضية — مع إبقاء الصورة المرفوعة
  const hero = await readValue(db, "content.hero");
  if (hero) {
    await writeSetting(db, "content.hero", { imageUrl: typeof hero.imageUrl === "string" ? hero.imageUrl : "" });
    console.log("✓ نصوص البانر");
  }

  const theme = await readValue(db, "theme.storefront");
  if (theme) {
    await writeSetting(db, "theme.storefront", { ...theme, primaryColor: BRAND.primaryColor, accentColor: BRAND.accentColor });
    console.log("✓ ألوان الثيم");
  }
}
