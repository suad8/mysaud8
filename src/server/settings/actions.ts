"use server";

import { revalidatePath } from "next/cache";
import {
  getMoyasarSettings,
  saveBankTransferSettings,
  saveMoyasarSettings,
} from "@/server/settings";

export async function updateBankSettingsAction(formData: FormData) {
  await saveBankTransferSettings({
    enabled: formData.get("enabled") === "on",
    bankName: String(formData.get("bankName") ?? "").trim(),
    accountName: String(formData.get("accountName") ?? "").trim(),
    iban: String(formData.get("iban") ?? "").trim(),
    accountNumber: String(formData.get("accountNumber") ?? "").trim(),
  });

  revalidatePath("/admin/settings");
  revalidatePath("/checkout");
}

export async function updateGatewaySettingsAction(formData: FormData) {
  const current = await getMoyasarSettings();
  const secretInput = String(formData.get("secretKey") ?? "").trim();

  await saveMoyasarSettings({
    enabled: formData.get("enabled") === "on",
    publishableKey: String(formData.get("publishableKey") ?? "").trim(),
    // حقل الفارغ يعني "أبقِ المفتاح المحفوظ سابقاً" — لا نفرغه بالخطأ عند إعادة الحفظ
    secretKey: secretInput || current.secretKey,
  });

  revalidatePath("/admin/settings");
}
