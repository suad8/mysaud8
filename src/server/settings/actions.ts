"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/auth/session";
import { logAudit } from "@/server/audit/log";
import { saveUploadedFile, UploadError } from "@/lib/uploads";
import {
  getHeroContent,
  getMoyasarSettings,
  saveBankTransferSettings,
  saveHeroContent,
  saveMoyasarSettings,
  saveStoreInfoSettings,
} from "@/server/settings";

export async function updateBankSettingsAction(formData: FormData) {
  const session = await requireAdmin();

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
  const session = await requireAdmin();
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

  await saveStoreInfoSettings({
    name,
    tagline: String(formData.get("tagline") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
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
    ctaHref: String(formData.get("ctaHref") ?? "").trim() || "/",
    secondaryCtaText: String(formData.get("secondaryCtaText") ?? "").trim(),
    secondaryCtaHref: String(formData.get("secondaryCtaHref") ?? "").trim() || "/",
    imageUrl,
  });
  await logAudit({ actorId: session.sub, action: "settings.hero.updated", entity: "Setting", entityId: "content.hero" });

  revalidatePath("/admin/settings");
  revalidatePath("/");
  return {};
}
