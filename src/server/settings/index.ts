import { db } from "@/server/db";

/**
 * طبقة الإعدادات — تخزين مفتاح/قيمة في جدول Setting (JSON) بدل ترحيل
 * قاعدة بيانات لكل إعداد جديد. كل دالة هنا تتعامل مع مجموعة إعدادات مترابطة.
 */

export type BankTransferSettings = {
  enabled: boolean;
  bankName: string;
  accountName: string;
  iban: string;
  accountNumber: string;
};

const BANK_DEFAULTS: BankTransferSettings = {
  enabled: true,
  bankName: "",
  accountName: "",
  iban: "",
  accountNumber: "",
};

export type GatewaySettings = {
  enabled: boolean;
  publishableKey: string;
  /** لا تُعرض القيمة الكاملة أبداً في الواجهة بعد الحفظ — انظر maskSecret */
  secretKey: string;
};

const GATEWAY_DEFAULTS: GatewaySettings = {
  enabled: false,
  publishableKey: "",
  secretKey: "",
};

async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.setting.findUnique({ where: { key } });
  if (!row) return fallback;
  return { ...fallback, ...(row.value as object) } as T;
}

async function setSetting(key: string, value: unknown) {
  await db.setting.upsert({
    where: { key },
    create: { key, value: value as never },
    update: { value: value as never },
  });
}

export function getBankTransferSettings() {
  return getSetting<BankTransferSettings>("payment.bankTransfer", BANK_DEFAULTS);
}

export function saveBankTransferSettings(value: BankTransferSettings) {
  return setSetting("payment.bankTransfer", value);
}

export function getMoyasarSettings() {
  return getSetting<GatewaySettings>("payment.moyasar", GATEWAY_DEFAULTS);
}

export function saveMoyasarSettings(value: GatewaySettings) {
  return setSetting("payment.moyasar", value);
}

export type StoreInfoSettings = {
  name: string;
  tagline: string;
  phone: string;
  email: string;
  /** شعار المتجر — فارغ يعني استخدام شارة الحرف الأول الافتراضية */
  logoUrl: string;
};

const STORE_INFO_DEFAULTS: StoreInfoSettings = {
  name: "فنجان",
  tagline: "قهوة مختصة وماتشا فاخرة",
  phone: "",
  email: "",
  logoUrl: "",
};

export function getStoreInfoSettings() {
  return getSetting<StoreInfoSettings>("store.info", STORE_INFO_DEFAULTS);
}

export function saveStoreInfoSettings(value: StoreInfoSettings) {
  return setSetting("store.info", value);
}

/** محتوى بانر الصفحة الرئيسية — فارغ = استخدام النص/الصورة الافتراضية بالكود. */
export type HeroContentSettings = {
  eyebrow: string;
  headline: string;
  headlineHighlight: string;
  subtitle: string;
  ctaText: string;
  ctaHref: string;
  secondaryCtaText: string;
  secondaryCtaHref: string;
  /** صورة بانر مخصّصة — إن كانت فارغة يُستخدم أحدث منتج مميّز تلقائياً */
  imageUrl: string;
};

const HERO_DEFAULTS: HeroContentSettings = {
  eyebrow: "تحميص جديد كل أسبوع",
  headline: "فنجانك المثالي",
  headlineHighlight: "يبدأ من هنا",
  subtitle: "قهوة مختصة تُحمَّص طازجة وماتشا يابانية فاخرة، مع أدوات تحضير مختارة بعناية — كل ما تحتاجه لتحضير فنجانك في بيتك.",
  ctaText: "تسوّق القهوة",
  ctaHref: "/c/coffee-beans",
  secondaryCtaText: "اكتشف الماتشا",
  secondaryCtaHref: "/c/matcha",
  imageUrl: "",
};

export function getHeroContent() {
  return getSetting<HeroContentSettings>("content.hero", HERO_DEFAULTS);
}

export function saveHeroContent(value: HeroContentSettings) {
  return setSetting("content.hero", value);
}

/** يعرض آخر 4 خانات فقط من مفتاح سرّي محفوظ، بدل كشفه كاملاً في الواجهة. */
export function maskSecret(secret: string): string {
  if (!secret) return "";
  if (secret.length <= 4) return "••••";
  return `••••••••${secret.slice(-4)}`;
}

/** أدوات قوقل للتسويق وتحسين الظهور — كل حقل اختياري، فارغ يعني غير مفعَّل. */
export type SeoMarketingSettings = {
  /** معرّف قياس Google Analytics 4 — يبدأ بـ G- */
  googleAnalyticsId: string;
  /** محتوى وسم التحقق من ملكية الموقع في Google Search Console (طريقة HTML tag) */
  googleSearchConsoleVerification: string;
  /** معرّف حاوية Google Tag Manager — يبدأ بـ GTM- (اختياري، بديل/إضافة لـ GA مباشر) */
  googleTagManagerId: string;
};

const SEO_MARKETING_DEFAULTS: SeoMarketingSettings = {
  googleAnalyticsId: "",
  googleSearchConsoleVerification: "",
  googleTagManagerId: "",
};

export function getSeoMarketingSettings() {
  return getSetting<SeoMarketingSettings>("marketing.google", SEO_MARKETING_DEFAULTS);
}

export function saveSeoMarketingSettings(value: SeoMarketingSettings) {
  return setSetting("marketing.google", value);
}

/** إظهار/إخفاء أقسام الصفحة الرئيسية — تحكّم كامل بتصميم المتجر دون لمس الكود. */
export type HomepageSectionsSettings = {
  hero: boolean;
  trustBar: boolean;
  categories: boolean;
  featured: boolean;
  bundle: boolean;
  testimonials: boolean;
  arrivals: boolean;
  finalCta: boolean;
};

const HOMEPAGE_SECTIONS_DEFAULTS: HomepageSectionsSettings = {
  hero: true,
  trustBar: true,
  categories: true,
  featured: true,
  bundle: true,
  testimonials: true,
  arrivals: true,
  finalCta: true,
};

export function getHomepageSections() {
  return getSetting<HomepageSectionsSettings>("content.homepageSections", HOMEPAGE_SECTIONS_DEFAULTS);
}

export function saveHomepageSections(value: HomepageSectionsSettings) {
  return setSetting("content.homepageSections", value);
}
