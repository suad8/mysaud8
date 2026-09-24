export const STORE_NAME = process.env.NEXT_PUBLIC_STORE_NAME ?? "الورقة الذهبية";
export const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY ?? "SAR";
export const TAX_RATE = Number(process.env.TAX_RATE ?? "0.15");
/** رابط الموقع الأساسي بلا / زائدة — يُستخدم في السايت ماب وروبوتس والبيانات المهيكلة وتغذية قوقل. */
export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** حالات الطلب بأسمائها العربية وألوان الشارات. */
export const ORDER_STATUS = {
  PENDING:    { label: "بانتظار الدفع", tone: "amber" },
  PAID:       { label: "مدفوع",          tone: "brand" },
  PROCESSING: { label: "قيد التجهيز",    tone: "blue" },
  SHIPPED:    { label: "تم الشحن",       tone: "violet" },
  DELIVERED:  { label: "تم التسليم",     tone: "green" },
  CANCELLED:  { label: "ملغي",           tone: "gray" },
  REFUNDED:   { label: "مسترجع",         tone: "red" },
} as const;

export type OrderStatusKey = keyof typeof ORDER_STATUS;

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  MADA: "مدى",
  CREDIT_CARD: "بطاقة ائتمانية",
  APPLE_PAY: "Apple Pay",
  STC_PAY: "STC Pay",
  TABBY: "تابي",
  TAMARA: "تمارا",
  COD: "الدفع عند الاستلام",
  BANK_TRANSFER: "تحويل بنكي",
};

export const PRODUCT_STATUS = {
  DRAFT:    { label: "مسودة",   tone: "gray" },
  ACTIVE:   { label: "منشور",   tone: "green" },
  ARCHIVED: { label: "مؤرشف",   tone: "amber" },
} as const;

export const ADMIN_ROLE_LABEL: Record<string, string> = {
  OWNER: "مالك",
  MANAGER: "مدير",
  STAFF: "موظف",
};
