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

/** يعرض آخر 4 خانات فقط من مفتاح سرّي محفوظ، بدل كشفه كاملاً في الواجهة. */
export function maskSecret(secret: string): string {
  if (!secret) return "";
  if (secret.length <= 4) return "••••";
  return `••••••••${secret.slice(-4)}`;
}
