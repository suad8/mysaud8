import { db } from "@/server/db";
import { THEME_DEFAULTS, normalizeFooter, normalizeHeaderMenu, normalizeSectionOrder, type ThemeSettings } from "@/lib/theme";
import { migrateLegacySections, sanitizeBlocks, type AnyHomeBlock } from "@/lib/home-blocks";

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
  name: "الورقة الذهبية",
  tagline: "حلول طباعة احترافية بجودة ذهبية",
  phone: "",
  email: "",
  logoUrl: "/brand/mark.png",
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
  /** المنتج في البطاقة العائمة: "" = تلقائي، HERO_PRODUCT_HIDDEN = إخفاء، أو رابط (slug) منتج محدد */
  floatingProductSlug: string;
  /** شارة الثقة العائمة (مثل "+2,400 عميل") — فارغة = إخفاء الشارة */
  badgeText: string;
  /** إحصائيتان أسفل الأزرار — قيمة فارغة = إخفاء تلك الإحصائية. عدد المنتجات يُحسب تلقائياً دائماً */
  stat1Value: string;
  stat1Label: string;
  stat2Value: string;
  stat2Label: string;
};

const HERO_DEFAULTS: HeroContentSettings = {
  eyebrow: "جودة طباعة ذهبية",
  headline: "اطبع أفكارك",
  headlineHighlight: "بلمسة ذهبية",
  subtitle: "ستيكرات، كروت أعمال ومطبوعات بجودة عالية — ارفع تصميمك واطلب بسهولة، ونوصّل لجميع مدن المملكة.",
  ctaText: "تسوّق المنتجات",
  ctaHref: "/products",
  secondaryCtaText: "",
  secondaryCtaHref: "/products",
  imageUrl: "",
  floatingProductSlug: "",
  // أرقام الثقة فارغة افتراضياً — لا نعرض إحصائيات لم يُدخلها صاحب المتجر بنفسه
  badgeText: "",
  stat1Value: "",
  stat1Label: "عميل سعيد",
  stat2Value: "",
  stat2Label: "متوسط التقييم",
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

export async function getThemeSettings(): Promise<ThemeSettings> {
  const theme = await getSetting<ThemeSettings>("theme.storefront", THEME_DEFAULTS);
  return {
    ...theme,
    sectionOrder: normalizeSectionOrder(theme.sectionOrder),
    featuredOrder: Array.isArray(theme.featuredOrder) ? theme.featuredOrder.filter((id) => typeof id === "string") : [],
    ...normalizeFooter(theme),
    ...normalizeHeaderMenu(theme),
  };
}

export function saveThemeSettings(value: ThemeSettings) {
  return setSetting("theme.storefront", value);
}

export function getHomepageSections() {
  return getSetting<HomepageSectionsSettings>("content.homepageSections", HOMEPAGE_SECTIONS_DEFAULTS);
}


const HOME_BLOCKS_KEY = "theme.homeBlocks";

/**
 * أقسام الصفحة الرئيسية من «تصميم الرئيسية». قبل أول حفظ تُبنى تلقائياً من
 * الأقسام القديمة الثابتة (الترتيب والإظهار والنصوص) فلا يتغيّر شكل المتجر.
 */
export async function getHomeBlocks(): Promise<AnyHomeBlock[]> {
  const row = await db.setting.findUnique({ where: { key: HOME_BLOCKS_KEY } });
  const saved = (row?.value as { blocks?: unknown } | null)?.blocks;
  if (Array.isArray(saved)) return sanitizeBlocks(saved);
  const [theme, visibility] = await Promise.all([getThemeSettings(), getHomepageSections()]);
  return migrateLegacySections(theme, visibility);
}

export function saveHomeBlocks(blocks: AnyHomeBlock[]) {
  return setSetting(HOME_BLOCKS_KEY, { blocks });
}

/** وضع الصيانة: الزوار يرون صفحة «نعود قريباً» بينما يتصفح المدير المسجّل دخوله المتجر كالمعتاد. */
export type MaintenanceSettings = { enabled: boolean; message: string };

const MAINTENANCE_DEFAULTS: MaintenanceSettings = {
  enabled: false,
  message: "نعمل حالياً على تحسين المتجر وسنعود قريباً — شكراً لصبركم.",
};

export function getMaintenanceSettings() {
  return getSetting<MaintenanceSettings>("store.maintenance", MAINTENANCE_DEFAULTS);
}

export function saveMaintenanceSettings(value: MaintenanceSettings) {
  return setSetting("store.maintenance", value);
}
