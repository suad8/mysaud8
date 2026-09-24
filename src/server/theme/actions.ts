"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/session";
import { logAudit } from "@/server/audit/log";
import { saveUploadedFile, UploadError } from "@/lib/uploads";
import { saveHomepageSections, saveThemeSettings, type HomepageSectionsSettings } from "@/server/settings";
import {
  DEFAULT_ACCENT_COLOR,
  DEFAULT_PRIMARY_COLOR,
  HEX_COLOR_PATTERN,
  HOMEPAGE_SECTION_KEYS,
  normalizeSectionOrder,
  normalizeSocialUrl,
  safeHref,
  SOCIAL_PLATFORMS,
  type FooterColumn,
  type SocialLink,
  type PaymentLogo,
  type ThemeSettings,
  type TrustItem,
} from "@/lib/theme";

export type ThemeFormState = { error?: string; success?: boolean; paymentLogos?: PaymentLogo[]; socialLinks?: SocialLink[] };

const text = (formData: FormData, key: string, max = 300) => String(formData.get(key) ?? "").trim().slice(0, max);

function clampInt(raw: FormDataEntryValue | null, min: number, max: number, fallback: number) {
  const n = Math.round(Number(raw));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

function readPairs(formData: FormData, titleKey: string, descKey: string): TrustItem[] {
  const titles = formData.getAll(titleKey).map((v) => String(v).trim().slice(0, 60));
  const descs = formData.getAll(descKey).map((v) => String(v).trim().slice(0, 120));
  return titles.map((title, i) => ({ title, desc: descs[i] ?? "" }));
}

function parseJson(raw: FormDataEntryValue | null): unknown {
  try {
    return JSON.parse(String(raw ?? ""));
  } catch {
    return null;
  }
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** أعمدة الفوتر تصل كـ JSON من محرّر الأعمدة — تُقيَّد الأطوال والأعداد، وأي رابط غير آمن يُستبعد. */
function parseFooterColumns(raw: FormDataEntryValue | null): FooterColumn[] {
  const data = parseJson(raw);
  if (!Array.isArray(data)) return [];
  return data.slice(0, 6).map((col) => {
    const c = (col ?? {}) as Record<string, unknown>;
    const links = (Array.isArray(c.links) ? c.links : [])
      .slice(0, 15)
      .map((l) => {
        const link = (l ?? {}) as Record<string, unknown>;
        return { label: str(link.label, 60), href: safeHref(str(link.href, 300), "") };
      })
      .filter((l) => l.label && l.href);
    return { title: str(c.title, 40), text: str(c.text, 600), links };
  });
}

function parseSocialLinks(raw: FormDataEntryValue | null): SocialLink[] {
  const data = parseJson(raw);
  if (!Array.isArray(data)) return [];
  return data
    .slice(0, 12)
    .map((l) => {
      const link = (l ?? {}) as Record<string, unknown>;
      const platform = SOCIAL_PLATFORMS.find((p) => p === link.platform);
      return platform ? { platform, url: normalizeSocialUrl(platform, str(link.url, 300)) } : null;
    })
    .filter((l): l is SocialLink => Boolean(l?.url));
}

export async function updateThemeAction(_prev: ThemeFormState, formData: FormData): Promise<ThemeFormState> {
  const session = await requireAdmin();

  const primaryColor = text(formData, "primaryColor", 7);
  const accentColor = text(formData, "accentColor", 7);

  // شعارات طرق الدفع: صفوف متوازية (الاسم، الرابط الحالي، ملف جديد اختياري)
  const names = formData.getAll("paymentName").map((v) => String(v).trim().slice(0, 40));
  const existingUrls = formData.getAll("paymentLogoUrl").map((v) => String(v));
  const files = formData.getAll("paymentLogoFile");
  const paymentLogos: PaymentLogo[] = [];
  for (let i = 0; i < names.length; i++) {
    if (!names[i]) continue;
    let logoUrl = existingUrls[i]?.startsWith("/api/uploads/branding/") ? existingUrls[i] : "";
    const file = files[i];
    if (file instanceof File && file.size > 0) {
      if (file.type === "application/pdf") return { error: `شعار "${names[i]}" يجب أن يكون صورة (PNG أو JPG أو WEBP)` };
      try {
        logoUrl = await saveUploadedFile(file, "branding");
      } catch (e) {
        return { error: e instanceof UploadError ? `شعار "${names[i]}": ${e.message}` : `تعذّر رفع شعار "${names[i]}"` };
      }
    }
    paymentLogos.push({ name: names[i], logoUrl });
  }

  const footerColumns = parseFooterColumns(formData.get("footerColumnsJson"));
  const socialLinks = parseSocialLinks(formData.get("socialLinksJson"));

  const theme: ThemeSettings = {
    primaryColor: HEX_COLOR_PATTERN.test(primaryColor) ? primaryColor.toLowerCase() : DEFAULT_PRIMARY_COLOR,
    accentColor: HEX_COLOR_PATTERN.test(accentColor) ? accentColor.toLowerCase() : DEFAULT_ACCENT_COLOR,
    announcement: text(formData, "announcement", 200),
    sectionOrder: normalizeSectionOrder(formData.getAll("sectionOrder").map(String)),

    trustItems: readPairs(formData, "trustTitle", "trustDesc"),

    categoriesEyebrow: text(formData, "categoriesEyebrow", 60),
    categoriesTitle: text(formData, "categoriesTitle", 80),

    featuredTitle: text(formData, "featuredTitle", 80),
    featuredSubtitle: text(formData, "featuredSubtitle", 160),
    featuredLinkText: text(formData, "featuredLinkText", 40),
    featuredLinkHref: safeHref(text(formData, "featuredLinkHref", 300), "/products"),
    featuredCount: clampInt(formData.get("featuredCount"), 1, 24, 8),
    featuredOrder: [],

    bundleProductSlug: text(formData, "bundleProductSlug", 200),
    bundleBadge: text(formData, "bundleBadge", 60),
    bundleCtaText: text(formData, "bundleCtaText", 40),

    testimonialsEyebrow: text(formData, "testimonialsEyebrow", 60),
    testimonialsTitle: text(formData, "testimonialsTitle", 80),

    arrivalsTitle: text(formData, "arrivalsTitle", 80),
    arrivalsCount: clampInt(formData.get("arrivalsCount"), 1, 24, 4),

    finalCtaTitle: text(formData, "finalCtaTitle", 100),
    finalCtaText: text(formData, "finalCtaText", 300),
    finalCtaButtonText: text(formData, "finalCtaButtonText", 40),
    finalCtaButtonHref: safeHref(text(formData, "finalCtaButtonHref", 300), "/products"),

    productTrust: readPairs(formData, "productTrustTitle", "productTrustDesc"),

    newsletterEnabled: formData.get("newsletterEnabled") === "on",
    newsletterTitle: text(formData, "newsletterTitle", 80),
    newsletterText: text(formData, "newsletterText", 200),

    footerAbout: text(formData, "footerAbout", 400),
    paymentLogos,
    socialLinks,
    footerColumns,
    commercialRegistration: text(formData, "commercialRegistration", 30),
    vatNumber: text(formData, "vatNumber", 30),
    footerNote: text(formData, "footerNote", 200),
  };

  const visibility = Object.fromEntries(
    HOMEPAGE_SECTION_KEYS.map((key) => [key, formData.get(`visible_${key}`) === "on"]),
  ) as HomepageSectionsSettings;

  // المنتجات البارزة: تُحدَّث فقط المنتجات المعروضة بالقائمة (المنشورة)؛
  // المسودات والمؤرشفة لا تُلمس حتى لا يضيع تمييزها دون قصد.
  const candidateIds = formData.getAll("featuredCandidateId").map(String).filter(Boolean);
  // ترتيب الحقول = ترتيب الظهور الذي اختاره المدير
  const featuredList = [...new Set(formData.getAll("featuredProductId").map(String))].filter((id) => candidateIds.includes(id));
  const featuredIds = new Set(featuredList);
  theme.featuredOrder = featuredList;

  await saveThemeSettings(theme);
  await saveHomepageSections(visibility);
  if (candidateIds.length > 0) {
    await db.$transaction([
      db.product.updateMany({ where: { id: { in: candidateIds.filter((id) => !featuredIds.has(id)) } }, data: { isFeatured: false } }),
      db.product.updateMany({ where: { id: { in: candidateIds.filter((id) => featuredIds.has(id)) } }, data: { isFeatured: true } }),
    ]);
  }

  await logAudit({ actorId: session.sub, action: "theme.updated", entity: "Setting", entityId: "theme.storefront" });

  revalidatePath("/", "layout");
  return { success: true, paymentLogos, socialLinks };
}
