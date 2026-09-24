/**
 * أرقام الجوال: توحيد ما يكتبه العميل (أرقام عربية، مسافات، +966 أو 05…)
 * وبناء روابط واتساب. ملف نقي يُستخدم في المتجر ولوحة التحكم.
 */
/** الأرقام العربية (٠-٩) والفارسية (۰-۹) إلى أرقام لاتينية. */
function toLatinDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

/** رقم سعودي بصيغة 05XXXXXXXX، أو رقم دولي بأرقام فقط (9–15 رقماً)، وإلا null. */
export function normalizePhone(raw: string): string | null {
  let digits = toLatinDigits(raw).replace(/[\s\-()+.]/g, "");
  if (!/^\d+$/.test(digits)) return null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (/^9665\d{8}$/.test(digits)) return `0${digits.slice(3)}`;
  if (/^5\d{8}$/.test(digits)) return `0${digits}`;
  if (/^05\d{8}$/.test(digits)) return digits;
  return /^\d{9,15}$/.test(digits) ? digits : null;
}

/** رابط محادثة واتساب مع العميل برسالة جاهزة — يحوّل 05… إلى 9665…. */
export function whatsappLink(phone: string, text: string): string | null {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  const international = normalized.startsWith("05") ? `966${normalized.slice(1)}` : normalized;
  return `https://wa.me/${international}?text=${encodeURIComponent(text)}`;
}
