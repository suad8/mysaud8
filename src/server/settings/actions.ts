"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin, requireOwner } from "@/server/auth/session";
import { logAudit } from "@/server/audit/log";
import { saveUploadedFile, UploadError } from "@/lib/uploads";
import { safeHref } from "@/lib/theme";
import {
  getHeroContent,
  getMoyasarSettings,
  getStoreInfoSettings,
  saveBankTransferSettings,
  saveHeroContent,
  saveMaintenanceSettings,
  saveMoyasarSettings,
  saveSeoMarketingSettings,
  saveStoreInfoSettings,
} from "@/server/settings";

// بيانات الحساب البنكي تُعرض للعملاء عند الدفع — تعديلها للمالك فقط (منع تحويل الأموال لحساب آخر)
export async function updateBankSettingsAction(formData: FormData) {
  const session = await requireOwner();

  await saveBankTransferSettings({
    enabled: formData.get("enabled") === "on",
    bankName: String(formData.get("bankName") ?? "").trim(),
    accountName: String(formData.get("accountName") ?? "").trim(),
    iban: String(formData.get("iban") ?? "").trim(),
    accountNumber: String(formData.get("accountNumber") ?? "").trim(),
  });
  // لا نسجّل رقم الآيبان/الحساب في التفاصيل — سجل التدقيق نفسه بيانات حسّاسة يجب تقليلها
  await logAudit({ actorId: session.sub, action: "settings.bank.updated", entity: "Setting", entityId: "payment.bankTransfer" });

  revalidatePath("/admin/settings");
  revalidatePath("/checkout");
}

export async function updateGatewaySettingsAction(formData: FormData) {
  const session = await requireOwner();
  const current = await getMoyasarSettings();
  const secretInput = String(formData.get("secretKey") ?? "").trim();

  await saveMoyasarSettings({
    enabled: formData.get("enabled") === "on",
    publishableKey: String(formData.get("publishableKey") ?? "").trim(),
    // حقل الفارغ يعني "أبقِ المفتاح المحفوظ سابقاً" — لا نفرغه بالخطأ عند إعادة الحفظ
    secretKey: secretInput || current.secretKey,
  });
  // لا نسجّل أي مفتاح فعلي في سجل التدقيق — فقط أن الإعداد تغيّر
  await logAudit({ actorId: session.sub, action: "settings.gateway.updated", entity: "Setting", entityId: "payment.moyasar" });

  revalidatePath("/admin/settings");
}

export type SettingsFormState = { error?: string };

export async function updateStoreInfoAction(
  _prevState: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const session = await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "اسم المتجر مطلوب" };

  const current = await getStoreInfoSettings();
  let logoUrl = current.logoUrl;
  const logoFile = formData.get("logo");
  if (logoFile instanceof File && logoFile.size > 0) {
    try {
      logoUrl = await saveUploadedFile(logoFile, "branding");
    } catch (e) {
      return { error: e instanceof UploadError ? e.message : "تعذّر رفع الشعار" };
    }
  } else if (formData.get("removeLogo") === "on") {
    logoUrl = "";
  }

  await saveStoreInfoSettings({
    name,
    tagline: String(formData.get("tagline") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    logoUrl,
  });
  await logAudit({ actorId: session.sub, action: "settings.storeInfo.updated", entity: "Setting", entityId: "store.info" });

  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
  return {};
}

export async function updateHeroContentAction(
  _prevState: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const session = await requireAdmin();

  const current = await getHeroContent();
  let imageUrl = current.imageUrl;

  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    try {
      imageUrl = await saveUploadedFile(file, "banners");
    } catch (e) {
      return { error: e instanceof UploadError ? e.message : "تعذّر رفع الصورة" };
    }
  } else if (formData.get("removeImage") === "on") {
    imageUrl = "";
  }

  await saveHeroContent({
    eyebrow: String(formData.get("eyebrow") ?? "").trim(),
    headline: String(formData.get("headline") ?? "").trim(),
    headlineHighlight: String(formData.get("headlineHighlight") ?? "").trim(),
    subtitle: String(formData.get("subtitle") ?? "").trim(),
    ctaText: String(formData.get("ctaText") ?? "").trim(),
    ctaHref: safeHref(String(formData.get("ctaHref") ?? "")),
    secondaryCtaText: String(formData.get("secondaryCtaText") ?? "").trim(),
    secondaryCtaHref: safeHref(String(formData.get("secondaryCtaHref") ?? "")),
    imageUrl,
    floatingProductSlug: String(formData.get("floatingProductSlug") ?? "").trim(),
    badgeText: String(formData.get("badgeText") ?? "").trim(),
    stat1Value: String(formData.get("stat1Value") ?? "").trim(),
    stat1Label: String(formData.get("stat1Label") ?? "").trim(),
    stat2Value: String(formData.get("stat2Value") ?? "").trim(),
    stat2Label: String(formData.get("stat2Label") ?? "").trim(),
  });
  await logAudit({ actorId: session.sub, action: "settings.hero.updated", entity: "Setting", entityId: "content.hero" });

  revalidatePath("/admin/homepage");
  revalidatePath("/");
  return {};
}

const GA_ID_PATTERN = /^G-[A-Z0-9]{6,12}$/;
const GTM_ID_PATTERN = /^GTM-[A-Z0-9]{4,10}$/;

export async function updateSeoMarketingAction(
  _prevState: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  // معرّفات GA/GTM تحقن سكربتات طرف ثالث في كل صفحات المتجر — للمالك فقط
  const session = await requireOwner();

  const googleAnalyticsId = String(formData.get("googleAnalyticsId") ?? "").trim();
  if (googleAnalyticsId && !GA_ID_PATTERN.test(googleAnalyticsId)) {
    return { error: "معرّف Google Analytics غير صالح — يجب أن يبدأ بـ G- (مثال: G-ABC1234567)" };
  }

  const googleTagManagerId = String(formData.get("googleTagManagerId") ?? "").trim();
  if (googleTagManagerId && !GTM_ID_PATTERN.test(googleTagManagerId)) {
    return { error: "معرّف Google Tag Manager غير صالح — يجب أن يبدأ بـ GTM- (مثال: GTM-ABCD123)" };
  }

  await saveSeoMarketingSettings({
    googleAnalyticsId,
    googleTagManagerId,
    googleSearchConsoleVerification: String(formData.get("googleSearchConsoleVerification") ?? "").trim(),
  });
  await logAudit({ actorId: session.sub, action: "settings.seoMarketing.updated", entity: "Setting", entityId: "marketing.google" });

  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
  return {};
}

/** وضع الصيانة يغلق المتجر أمام كل الزوار — للمالك فقط. */
export async function updateMaintenanceAction(formData: FormData) {
  const session = await requireOwner();
  const enabled = formData.get("enabled") === "on";
  await saveMaintenanceSettings({
    enabled,
    message: String(formData.get("message") ?? "").trim().slice(0, 400),
  });
  await logAudit({ actorId: session.sub, action: "settings.maintenance.updated", entity: "Setting", entityId: "store.maintenance", diff: { enabled } });

  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
}
