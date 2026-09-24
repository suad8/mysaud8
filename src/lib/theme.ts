/**
 * أنواع وقيم "الثيم" الافتراضية — ملف نقي بلا اتصال بقاعدة البيانات حتى
 * يمكن استيراده من مكوّنات العميل (نماذج لوحة التحكم) ومن الخادم معاً.
 */

export const HERO_PRODUCT_HIDDEN = "__none__";

export const HOMEPAGE_SECTION_KEYS = [
  "hero",
  "trustBar",
  "categories",
  "featured",
  "bundle",
  "testimonials",
  "arrivals",
  "finalCta",
] as const;

export type HomepageSectionKey = (typeof HOMEPAGE_SECTION_KEYS)[number];

export type TrustItem = { title: string; desc: string };
export type LinkItem = { label: string; href: string };
/** عمود بالفوتر: عنوان + نص حر اختياري (ساعات العمل، العنوان، ملخص سياسة...) + روابط */
export type FooterColumn = { title: string; text: string; links: LinkItem[] };

export const SOCIAL_PLATFORMS = ["whatsapp", "instagram", "x", "tiktok", "snapchat", "youtube", "facebook", "telegram", "threads"] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];
export type SocialLink = { platform: SocialPlatform; url: string };

export const SOCIAL_PLATFORM_LABEL: Record<SocialPlatform, string> = {
  whatsapp: "واتساب",
  instagram: "انستقرام",
  x: "إكس (تويتر)",
  tiktok: "تيك توك",
  snapchat: "سناب شات",
  youtube: "يوتيوب",
  facebook: "فيسبوك",
  telegram: "تيليجرام",
  threads: "ثريدز",
};

/** رابط الحساب من اسم المستخدم (بدون @) — لمن يكتب اسم الحساب بدل الرابط الكامل */
const SOCIAL_PROFILE_URL: Record<Exclude<SocialPlatform, "whatsapp">, (handle: string) => string> = {
  instagram: (h) => `https://instagram.com/${h}`,
  x: (h) => `https://x.com/${h}`,
  tiktok: (h) => `https://www.tiktok.com/@${h}`,
  snapchat: (h) => `https://www.snapchat.com/add/${h}`,
  youtube: (h) => `https://www.youtube.com/@${h}`,
  facebook: (h) => `https://www.facebook.com/${h}`,
  telegram: (h) => `https://t.me/${h}`,
  threads: (h) => `https://www.threads.net/@${h}`,
};

/**
 * يحوّل ما يكتبه المدير إلى رابط آمن: رابط https كامل، أو اسم حساب (@name)،
 * أو رقم جوال لواتساب (05xxxxxxxx أو 9665xxxxxxxx). يعيد "" إن كان غير صالح.
 */
export function normalizeSocialUrl(platform: SocialPlatform, raw: string): string {
  const value = raw.trim();
  if (!value) return "";
  if (/^https:\/\/[^\s"'<>]+$/i.test(value)) return value;
  if (platform === "whatsapp") {
    let digits = value.replace(/[\s\-()+]/g, "");
    if (!/^\d{9,15}$/.test(digits)) return "";
    if (digits.startsWith("05")) digits = `966${digits.slice(1)}`;
    return `https://wa.me/${digits}`;
  }
  const handle = value.replace(/^@/, "");
  return /^[\w.\-]{1,60}$/.test(handle) ? SOCIAL_PROFILE_URL[platform](handle) : "";
}
export type PaymentLogo = { name: string; logoUrl: string };

export type ThemeSettings = {
  primaryColor: string;
  accentColor: string;
  /** شريط الإعلان أعلى كل الصفحات — فارغ = إخفاء */
  announcement: string;
  /** قائمة الهيدر: "categories" = التصنيفات تلقائياً، "custom" = روابط يختارها المدير بالترتيب */
  headerMenuMode: "categories" | "custom";
  headerMenu: LinkItem[];
  /** ترتيب الأقسام القديمة الثابتة — يُستخدم فقط لترحيلها إلى «تصميم الرئيسية» */
  sectionOrder: HomepageSectionKey[];

  trustItems: TrustItem[];

  categoriesEyebrow: string;
  categoriesTitle: string;

  featuredTitle: string;
  featuredSubtitle: string;
  featuredLinkText: string;
  featuredLinkHref: string;
  featuredCount: number;
  /** ترتيب المنتجات البارزة (معرّفات) — ما لم يُرتَّب يظهر بعدها حسب الأحدث */
  featuredOrder: string[];

  /** "" = تلقائي (أحدث منتج عليه خصم) */
  bundleProductSlug: string;
  bundleBadge: string;
  bundleCtaText: string;

  testimonialsEyebrow: string;
  testimonialsTitle: string;

  arrivalsTitle: string;
  arrivalsCount: number;

  finalCtaTitle: string;
  finalCtaText: string;
  finalCtaButtonText: string;
  finalCtaButtonHref: string;

  /** مزايا صغيرة تحت زر الشراء بصفحة المنتج */
  productTrust: TrustItem[];

  /** زر واتساب العائم في كل صفحات المتجر — رقم فارغ = إخفاء الزر */
  whatsappFloatNumber: string;
  whatsappFloatMessage: string;

  newsletterEnabled: boolean;
  newsletterTitle: string;
  newsletterText: string;

  footerAbout: string;
  paymentLogos: PaymentLogo[];
  /** أيقونات حسابات التواصل تحت نبذة المتجر */
  socialLinks: SocialLink[];
  footerColumns: FooterColumn[];
  /** رقم السجل التجاري — فارغ = إخفاء */
  commercialRegistration: string;
  /** الرقم الضريبي للمتجر — فارغ = إخفاء */
  vatNumber: string;
  footerNote: string;
};

/** ألوان هوية "الورقة الذهبية" — تطابق globals.css، فلا يُحقن أي CSS إضافي عند استخدامها */
export const DEFAULT_PRIMARY_COLOR = "#663dff";
export const DEFAULT_ACCENT_COLOR = "#ffc430";

export const THEME_DEFAULTS: ThemeSettings = {
  primaryColor: DEFAULT_PRIMARY_COLOR,
  accentColor: DEFAULT_ACCENT_COLOR,
  announcement: "طباعة احترافية بجودة ذهبية · توصيل لجميع مدن المملكة",
  headerMenuMode: "categories",
  headerMenu: [],
  sectionOrder: [...HOMEPAGE_SECTION_KEYS],

  trustItems: [
    { title: "جودة طباعة عالية", desc: "خامات وأحبار فاخرة" },
    { title: "شحن سريع", desc: "لجميع مدن المملكة" },
    { title: "دفع آمن", desc: "مدى و Apple Pay وتابي وتمارا" },
    { title: "تصميمك الخاص", desc: "ارفع ملفك مع الطلب" },
  ],

  categoriesEyebrow: "منتجاتنا",
  categoriesTitle: "تسوّق حسب الفئة",

  featuredTitle: "الأكثر طلباً",
  featuredSubtitle: "اختيارات عملائنا هذا الشهر",
  featuredLinkText: "عرض الكل ←",
  featuredLinkHref: "/products",
  featuredCount: 8,
  featuredOrder: [],

  bundleProductSlug: "",
  bundleBadge: "عرض خاص",
  bundleCtaText: "اطلبه الآن",

  testimonialsEyebrow: "آراء حقيقية",
  testimonialsTitle: "عملاؤنا هم سر نجاحنا",

  arrivalsTitle: "وصل حديثاً",
  arrivalsCount: 4,

  finalCtaTitle: "جاهز تطبع مشروعك القادم؟",
  finalCtaText: "اختر منتجك، ارفع تصميمك، ونوصّله لباب مكتبك.",
  finalCtaButtonText: "ابدأ الطلب",
  finalCtaButtonHref: "/products",

  productTrust: [
    { title: "جودة", desc: "طباعة احترافية" },
    { title: "شحن", desc: "لكل المدن" },
    { title: "الدفع", desc: "آمن 100%" },
  ],

  whatsappFloatNumber: "",
  whatsappFloatMessage: "السلام عليكم، عندي استفسار عن منتجاتكم",

  newsletterEnabled: true,
  newsletterTitle: "انضم لنشرتنا البريدية",
  newsletterText: "أحدث العروض والمنتجات، مباشرة لبريدك.",

  footerAbout: "",
  paymentLogos: [
    { name: "مدى", logoUrl: "" },
    { name: "Apple Pay", logoUrl: "" },
    { name: "فيزا", logoUrl: "" },
    { name: "ماستركارد", logoUrl: "" },
    { name: "تابي", logoUrl: "" },
    { name: "تمارا", logoUrl: "" },
  ],
  socialLinks: [],
  footerColumns: [
    { title: "المتجر", text: "", links: [{ label: "كل المنتجات", href: "/products" }] },
    {
      title: "المساعدة",
      text: "",
      links: [
        { label: "الشحن والتوصيل", href: "/pages/shipping" },
        { label: "الاستبدال والإرجاع", href: "/pages/returns" },
        { label: "تواصل معنا", href: "/pages/contact" },
      ],
    },
    {
      title: "عن المتجر",
      text: "",
      links: [
        { label: "من نحن", href: "/pages/about" },
        { label: "سياسة الخصوصية", href: "/pages/privacy" },
        { label: "الشروط والأحكام", href: "/pages/terms" },
      ],
    },
  ],
  commercialRegistration: "",
  vatNumber: "",
  footerNote: "الأسعار تشمل ضريبة القيمة المضافة 15%",
};

export const COLOR_PRESETS: { name: string; primary: string; accent: string }[] = [
  { name: "الورقة الذهبية (الافتراضي)", primary: "#663dff", accent: "#ffc430" },
  { name: "بنفسجي ووردي", primary: "#7239dd", accent: "#e83e9a" },
  { name: "ذهبي", primary: "#a16207", accent: "#292524" },
  { name: "أزرق", primary: "#1d4ed8", accent: "#f59e0b" },
  { name: "أخضر", primary: "#047857", accent: "#f59e0b" },
  { name: "أحمر", primary: "#b91c1c", accent: "#1f2937" },
  { name: "أسود", primary: "#171717", accent: "#ca8a04" },
];

export const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

/**
 * يقبل فقط روابط داخلية ("/…" وليس "//…") أو http(s) — يمنع روابط مثل
 * javascript: من الوصول لصفحات المتجر عبر حقول الروابط القابلة للتعديل.
 */
export function safeHref(href: string, fallback = "/"): string {
  const value = href.trim();
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  if (/^https?:\/\/[^\s]+$/i.test(value)) return value;
  // بريد وهاتف (مثلاً في روابط الفوتر) — بلا مسافات أو علامات تنصيص
  if (/^mailto:[^\s"'<>]+@[^\s"'<>]+$/i.test(value)) return value;
  if (/^tel:\+?[\d\-]{6,20}$/i.test(value)) return value;
  return fallback;
}

/** يطبّع أعمدة/حسابات الفوتر المحفوظة (بيانات أقدم قد لا تحتوي الحقول الجديدة). */
export function normalizeFooter(theme: Pick<ThemeSettings, "footerColumns" | "socialLinks">) {
  const columns = Array.isArray(theme.footerColumns) ? theme.footerColumns : [];
  const social = Array.isArray(theme.socialLinks) ? theme.socialLinks : [];
  return {
    footerColumns: columns.map((c) => ({
      title: typeof c?.title === "string" ? c.title : "",
      text: typeof c?.text === "string" ? c.text : "",
      links: Array.isArray(c?.links) ? c.links.filter((l) => typeof l?.label === "string" && typeof l?.href === "string") : [],
    })),
    socialLinks: social.filter((l) => SOCIAL_PLATFORMS.includes(l?.platform) && typeof l?.url === "string" && l.url.startsWith("https://")),
  };
}

/** روابط قائمة الهيدر المحفوظة — تُستبعد أي عناصر ناقصة أو روابط غير آمنة. */
export function normalizeHeaderMenu(theme: Pick<ThemeSettings, "headerMenuMode" | "headerMenu">) {
  const items = Array.isArray(theme.headerMenu) ? theme.headerMenu : [];
  return {
    headerMenuMode: theme.headerMenuMode === "custom" ? ("custom" as const) : ("categories" as const),
    headerMenu: items
      .filter((l) => typeof l?.label === "string" && typeof l?.href === "string")
      .map((l) => ({ label: l.label.slice(0, 40), href: safeHref(l.href, "") }))
      .filter((l) => l.label && l.href)
      .slice(0, 12),
  };
}

/** يرتّب الأقسام حسب إعداد المدير، ويضيف أي قسم ناقص في النهاية. */
export function normalizeSectionOrder(order: unknown): HomepageSectionKey[] {
  const valid = Array.isArray(order)
    ? order.filter((k): k is HomepageSectionKey => HOMEPAGE_SECTION_KEYS.includes(k as HomepageSectionKey))
    : [];
  const unique = [...new Set(valid)];
  return [...unique, ...HOMEPAGE_SECTION_KEYS.filter((k) => !unique.includes(k))];
}

function scale(color: string, steps: [string, number, "white" | "black" | null][]): string {
  return steps
    .map(([name, pct, target]) =>
      target ? `${name}: color-mix(in oklab, ${color} ${pct}%, ${target});` : `${name}: ${color};`,
    )
    .join("\n");
}

/**
 * يولّد متغيّرات ألوان Tailwind (brand/accent) من لون أساسي واحد لكل منهما.
 * يُرجع null عند استخدام الألوان الافتراضية حتى تبقى الدرجات المضبوطة يدوياً
 * في globals.css كما هي. القيم مُتحقَّق منها كـ hex قبل إدراجها في CSS.
 */
export function themeColorCss(primary: string, accent: string): string | null {
  const p = HEX_COLOR_PATTERN.test(primary) ? primary : DEFAULT_PRIMARY_COLOR;
  const a = HEX_COLOR_PATTERN.test(accent) ? accent : DEFAULT_ACCENT_COLOR;
  if (p.toLowerCase() === DEFAULT_PRIMARY_COLOR && a.toLowerCase() === DEFAULT_ACCENT_COLOR) return null;

  const brand = scale(p, [
    ["--color-brand-50", 8, "white"],
    ["--color-brand-100", 15, "white"],
    ["--color-brand-200", 30, "white"],
    ["--color-brand-300", 48, "white"],
    ["--color-brand-400", 68, "white"],
    ["--color-brand-500", 86, "white"],
    ["--color-brand-600", 100, null],
    ["--color-brand-700", 84, "black"],
    ["--color-brand-800", 70, "black"],
    ["--color-brand-900", 58, "black"],
    ["--color-brand-950", 36, "black"],
  ]);
  const acc = scale(a, [
    ["--color-accent-50", 8, "white"],
    ["--color-accent-100", 15, "white"],
    ["--color-accent-200", 30, "white"],
    ["--color-accent-300", 50, "white"],
    ["--color-accent-400", 75, "white"],
    ["--color-accent-500", 100, null],
    ["--color-accent-600", 88, "black"],
    ["--color-accent-700", 74, "black"],
    ["--color-accent-800", 62, "black"],
    ["--color-accent-900", 52, "black"],
  ]);
  // نص أزرار اللون المميّز: غامق فوق الألوان الفاتحة (كالذهبي)، أبيض فوق الغامقة
  const onAccent = relativeLuminance(a) > 0.4 ? "var(--color-brand-900)" : "#ffffff";
  return `:root {\n${brand}\n${acc}\n--color-on-accent: ${onAccent};\n}`;
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
