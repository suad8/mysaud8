/**
 * أقسام الصفحة الرئيسية القابلة للإضافة والحذف والترتيب (مثل مكوّنات «المصمم» في سلة).
 * ملف نقي بلا قاعدة بيانات: الأنواع، القيم الافتراضية، والتنظيف قبل الحفظ.
 */
import { safeHref, type HomepageSectionKey, type ThemeSettings } from "@/lib/theme";

export const BLOCK_TYPES = [
  "hero",
  "slider",
  "banner",
  "squares",
  "products",
  "categories",
  "features",
  "testimonials",
  "text",
  "video",
  "brands",
  "countdown",
  "cta",
  "bundle",
] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

export const BLOCK_META: Record<BlockType, { label: string; desc: string; icon: string }> = {
  hero: { label: "البانر الرئيسي", desc: "العنوان الكبير والصورة وأزرار البداية", icon: "🏠" },
  slider: { label: "سلايدر صور", desc: "صور متحركة بعناوين وأزرار", icon: "🖼️" },
  banner: { label: "بانر ثابت", desc: "صورة عريضة واحدة برابط", icon: "🪧" },
  squares: { label: "صور مربعة", desc: "2–4 صور بروابط (عروض، تصنيفات)", icon: "🔲" },
  products: { label: "منتجات", desc: "البارزة أو الأحدث أو من تصنيف أو تختارها", icon: "🛍️" },
  categories: { label: "التصنيفات", desc: "بطاقات تصنيفات المتجر", icon: "🗂️" },
  features: { label: "مميزات المتجر", desc: "شحن سريع، دفع آمن… بأيقونات", icon: "✨" },
  testimonials: { label: "آراء العملاء", desc: "أحدث التقييمات الإيجابية", icon: "💬" },
  text: { label: "نص", desc: "عنوان وفقرة وزر", icon: "📝" },
  video: { label: "فيديو يوتيوب", desc: "فيديو تعريفي من يوتيوب", icon: "▶️" },
  brands: { label: "شعارات", desc: "شعارات عملاء أو علامات تجارية", icon: "🏷️" },
  countdown: { label: "عرض بعدّاد تنازلي", desc: "عرض محدود بوقت ينتهي", icon: "⏳" },
  cta: { label: "دعوة لإجراء", desc: "عنوان بارز وزر", icon: "📣" },
  bundle: { label: "عرض منتج", desc: "منتج واحد بارز بتصميم كبير", icon: "🎁" },
};

export const FEATURE_ICONS = {
  quality: "M12 2c4 4 6 7 6 11a6 6 0 1 1-12 0c0-4 2-7 6-11Z",
  shipping: "M3 7h11v8H3zM14 10h4l3 3v2h-7z M7 18a2 2 0 100-4 2 2 0 000 4zM17 18a2 2 0 100-4 2 2 0 000 4z",
  secure: "M5 10V7a7 7 0 0 1 14 0v3M4 10h16v10H4z",
  shield: "M12 2l8 4v6c0 5-3.4 8.7-8 10-4.6-1.3-8-5-8-10V6zM9 12l2 2 4-4",
  support: "M4 12a8 8 0 1 1 16 0v4a2 2 0 0 1-2 2h-2v-6h4M4 12v4a2 2 0 0 0 2 2h2v-6H4",
  print: "M6 9V3h12v6M6 17H4v-6h16v6h-2M8 14h8v7H8z",
  star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z",
  return: "M4 9h11a5 5 0 0 1 0 10H9M4 9l4-4M4 9l4 4",
} as const;
export type FeatureIcon = keyof typeof FEATURE_ICONS;
export const FEATURE_ICON_LABEL: Record<FeatureIcon, string> = {
  quality: "جودة",
  shipping: "شحن",
  secure: "أمان",
  shield: "ضمان",
  support: "دعم",
  print: "طباعة",
  star: "تميّز",
  return: "استرجاع",
};

export type Slide = { imageUrl: string; title: string; subtitle: string; buttonText: string; href: string };
export type LinkedImage = { imageUrl: string; title: string; href: string };
export type FeatureItem = { icon: FeatureIcon; title: string; desc: string };
export type ProductSource = "featured" | "newest" | "sale" | "category" | "manual";

export type BlockData = {
  hero: Record<string, never>;
  slider: { slides: Slide[]; autoplay: boolean };
  banner: { imageUrl: string; href: string; title: string; subtitle: string; buttonText: string };
  squares: { title: string; items: LinkedImage[] };
  products: {
    title: string;
    subtitle: string;
    source: ProductSource;
    categorySlug: string;
    productIds: string[];
    count: number;
    layout: "grid" | "slider";
    linkText: string;
    linkHref: string;
  };
  categories: { eyebrow: string; title: string };
  features: { items: FeatureItem[] };
  testimonials: { eyebrow: string; title: string; count: number };
  text: { title: string; body: string; buttonText: string; href: string; align: "center" | "start" };
  video: { title: string; youtubeUrl: string };
  brands: { title: string; items: LinkedImage[] };
  countdown: { title: string; subtitle: string; endsAt: string; buttonText: string; href: string };
  cta: { title: string; text: string; buttonText: string; href: string };
  bundle: { productSlug: string; badge: string; ctaText: string };
};

export type HomeBlock<T extends BlockType = BlockType> = { id: string; type: T; visible: boolean; data: BlockData[T] };
export type AnyHomeBlock = { [K in BlockType]: HomeBlock<K> }[BlockType];

export const MAX_BLOCKS = 40;

/** وقت نهاية العدّاد يُكتب بتوقيت الرياض (حقل datetime-local بلا منطقة زمنية). */
const RIYADH_OFFSET_MS = 3 * 3600000;
function riyadhLocal(ms: number): string {
  return new Date(ms + RIYADH_OFFSET_MS).toISOString().slice(0, 16);
}

/** لحظة انتهاء العدّاد بالميلي ثانية (تفسير القيمة بتوقيت الرياض) — NaN إن كانت غير صالحة. */
export function countdownTarget(endsAt: string): number {
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(endsAt)) return Date.parse(`${endsAt}:00+03:00`);
  return Date.parse(endsAt);
}

export function newBlockId(): string {
  return `b-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** القيم الافتراضية عند إضافة قسم جديد — نصوص مناسبة لمتجر طباعة يعدّلها المالك. */
export function defaultBlockData<T extends BlockType>(type: T): BlockData[T] {
  const defaults: { [K in BlockType]: BlockData[K] } = {
    hero: {},
    slider: { slides: [{ imageUrl: "", title: "عنوان الشريحة", subtitle: "", buttonText: "تسوّق الآن", href: "/products" }], autoplay: true },
    banner: { imageUrl: "", href: "/products", title: "", subtitle: "", buttonText: "" },
    squares: { title: "", items: [{ imageUrl: "", title: "", href: "/products" }, { imageUrl: "", title: "", href: "/products" }] },
    products: { title: "منتجات مختارة", subtitle: "", source: "newest", categorySlug: "", productIds: [], count: 8, layout: "grid", linkText: "عرض الكل ←", linkHref: "/products" },
    categories: { eyebrow: "تسوّق حسب التصنيف", title: "ماذا تبحث عنه اليوم؟" },
    features: {
      items: [
        { icon: "quality", title: "جودة طباعة عالية", desc: "خامات مختارة وألوان دقيقة" },
        { icon: "shipping", title: "توصيل سريع", desc: "لجميع مدن المملكة" },
        { icon: "secure", title: "دفع آمن", desc: "بطرق دفع موثوقة" },
        { icon: "support", title: "دعم متواصل", desc: "نساعدك في تصميمك" },
      ],
    },
    testimonials: { eyebrow: "آراء عملائنا", title: "ماذا يقول عملاؤنا", count: 3 },
    text: { title: "عنوان القسم", body: "اكتب هنا نصاً تعريفياً أو عرضاً خاصاً.", buttonText: "", href: "/products", align: "center" },
    video: { title: "", youtubeUrl: "" },
    brands: { title: "شركاء النجاح", items: [] },
    countdown: { title: "عرض لفترة محدودة", subtitle: "خصم خاص ينتهي قريباً", endsAt: riyadhLocal(Date.now() + 3 * 86400000), buttonText: "استفد من العرض", href: "/products" },
    cta: { title: "جاهز لطباعة تصميمك؟", text: "أرسل تصميمك واستلم مطبوعاتك بجودة احترافية.", buttonText: "ابدأ الآن", href: "/products" },
    bundle: { productSlug: "", badge: "عرض خاص", ctaText: "اطلبه الآن" },
  };
  return structuredClone(defaults[type]) as BlockData[T];
}

// ── التنظيف قبل الحفظ ──────────────────────────────────────────
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);
const int = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const arr = (v: unknown, max: number): unknown[] => (Array.isArray(v) ? v.slice(0, max) : []);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});

/** صور الأقسام: مسارات داخلية فقط (ملفات مرفوعة أو ثابتة) — لا روابط خارجية ولا مخططات أخرى. */
export function safeImageUrl(v: unknown): string {
  const url = str(v, 300);
  return /^\/(api\/uploads\/(home|branding|banners|products)\/[\w.-]+|brand\/[\w.-]+|products\/[\w.-]+)$/.test(url) ? url : "";
}

/** رقم فيديو يوتيوب من روابط يوتيوب الشائعة (https فقط) — وإلا فارغ. */
export function youtubeId(url: string): string {
  const m = /^https:\/\/(?:(?:www|m)\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/.exec(url);
  return m?.[1] ?? "";
}

const linkedImage = (v: unknown): LinkedImage => {
  const o = obj(v);
  return { imageUrl: safeImageUrl(o.imageUrl), title: str(o.title, 80), href: safeHref(str(o.href, 300), "") };
};

function sanitizeData(type: BlockType, raw: unknown): BlockData[BlockType] {
  const d = obj(raw);
  switch (type) {
    case "hero":
      return {};
    case "slider":
      return {
        slides: arr(d.slides, 8).map((s) => {
          const o = obj(s);
          return { imageUrl: safeImageUrl(o.imageUrl), title: str(o.title, 100), subtitle: str(o.subtitle, 200), buttonText: str(o.buttonText, 40), href: safeHref(str(o.href, 300), "") };
        }),
        autoplay: bool(d.autoplay, true),
      };
    case "banner":
      return { imageUrl: safeImageUrl(d.imageUrl), href: safeHref(str(d.href, 300), ""), title: str(d.title, 100), subtitle: str(d.subtitle, 200), buttonText: str(d.buttonText, 40) };
    case "squares":
      return { title: str(d.title, 100), items: arr(d.items, 4).map(linkedImage) };
    case "products": {
      const source = (["featured", "newest", "sale", "category", "manual"] as const).find((s) => s === d.source) ?? "newest";
      return {
        title: str(d.title, 100),
        subtitle: str(d.subtitle, 200),
        source,
        categorySlug: str(d.categorySlug, 200),
        productIds: arr(d.productIds, 24).map((id) => str(id, 40)).filter(Boolean),
        count: int(d.count, 1, 24, 8),
        layout: d.layout === "slider" ? "slider" : "grid",
        linkText: str(d.linkText, 40),
        linkHref: safeHref(str(d.linkHref, 300), "/products"),
      };
    }
    case "categories":
      return { eyebrow: str(d.eyebrow, 60), title: str(d.title, 100) };
    case "features":
      return {
        items: arr(d.items, 8).map((it) => {
          const o = obj(it);
          const icon = (Object.keys(FEATURE_ICONS) as FeatureIcon[]).find((k) => k === o.icon) ?? "star";
          return { icon, title: str(o.title, 60), desc: str(o.desc, 120) };
        }),
      };
    case "testimonials":
      return { eyebrow: str(d.eyebrow, 60), title: str(d.title, 100), count: int(d.count, 1, 12, 3) };
    case "text":
      return { title: str(d.title, 120), body: str(d.body, 2000), buttonText: str(d.buttonText, 40), href: safeHref(str(d.href, 300), ""), align: d.align === "start" ? "start" : "center" };
    case "video": {
      // يُحفظ فقط رابط يوتيوب حقيقي — والعرض يستخدم رقم الفيديو وحده في iframe بنطاق youtube-nocookie
      const url = str(d.youtubeUrl, 300);
      return { title: str(d.title, 100), youtubeUrl: youtubeId(url) ? url : "" };
    }
    case "brands":
      return { title: str(d.title, 100), items: arr(d.items, 20).map(linkedImage) };
    case "countdown": {
      const endsAt = str(d.endsAt, 30);
      return { title: str(d.title, 100), subtitle: str(d.subtitle, 200), endsAt: Number.isNaN(countdownTarget(endsAt)) ? "" : endsAt, buttonText: str(d.buttonText, 40), href: safeHref(str(d.href, 300), "") };
    }
    case "cta":
      return { title: str(d.title, 120), text: str(d.text, 400), buttonText: str(d.buttonText, 40), href: safeHref(str(d.href, 300), "/products") };
    case "bundle":
      return { productSlug: str(d.productSlug, 200), badge: str(d.badge, 60), ctaText: str(d.ctaText, 40) };
  }
}

export function sanitizeBlocks(raw: unknown): AnyHomeBlock[] {
  const seen = new Set<string>();
  const blocks: AnyHomeBlock[] = [];
  for (const item of arr(raw, MAX_BLOCKS)) {
    const o = obj(item);
    const type = BLOCK_TYPES.find((t) => t === o.type);
    if (!type) continue;
    let id = str(o.id, 60);
    if (!id || seen.has(id)) id = newBlockId();
    seen.add(id);
    blocks.push({ id, type, visible: bool(o.visible, true), data: sanitizeData(type, o.data) } as AnyHomeBlock);
  }
  return blocks;
}

const FEATURE_ICON_ORDER: FeatureIcon[] = ["quality", "shipping", "secure", "shield"];

/** تحويل الأقسام الثابتة القديمة (ترتيب + إظهار + نصوص الثيم) إلى أقسام المصمّم — نفس الشكل تماماً. */
export function migrateLegacySections(theme: ThemeSettings, visibility: Record<HomepageSectionKey, boolean>): AnyHomeBlock[] {
  const make = (key: HomepageSectionKey): AnyHomeBlock => {
    const visible = visibility[key] !== false;
    switch (key) {
      case "hero":
        return { id: "hero", type: "hero", visible, data: {} };
      case "trustBar":
        return {
          id: "features",
          type: "features",
          visible,
          data: { items: theme.trustItems.filter((t) => t.title).map((t, i) => ({ icon: FEATURE_ICON_ORDER[i % 4]!, title: t.title, desc: t.desc })) },
        };
      case "categories":
        return { id: "categories", type: "categories", visible, data: { eyebrow: theme.categoriesEyebrow, title: theme.categoriesTitle } };
      case "featured":
        return {
          id: "featured",
          type: "products",
          visible,
          data: { title: theme.featuredTitle, subtitle: theme.featuredSubtitle, source: "featured", categorySlug: "", productIds: [], count: theme.featuredCount, layout: "grid", linkText: theme.featuredLinkText, linkHref: theme.featuredLinkHref },
        };
      case "bundle":
        return { id: "bundle", type: "bundle", visible, data: { productSlug: theme.bundleProductSlug, badge: theme.bundleBadge, ctaText: theme.bundleCtaText } };
      case "testimonials":
        return { id: "testimonials", type: "testimonials", visible, data: { eyebrow: theme.testimonialsEyebrow, title: theme.testimonialsTitle, count: 3 } };
      case "arrivals":
        return {
          id: "arrivals",
          type: "products",
          visible,
          data: { title: theme.arrivalsTitle, subtitle: "", source: "newest", categorySlug: "", productIds: [], count: theme.arrivalsCount, layout: "grid", linkText: "", linkHref: "/products" },
        };
      case "finalCta":
        return { id: "cta", type: "cta", visible, data: { title: theme.finalCtaTitle, text: theme.finalCtaText, buttonText: theme.finalCtaButtonText, href: theme.finalCtaButtonHref } };
    }
  };
  return theme.sectionOrder.map(make);
}
