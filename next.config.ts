import type { NextConfig } from "next";

const securityHeaders = [
  // يمنع تحميل الموقع داخل iframe بموقع آخر (حماية من clickjacking، مهم
  // خصوصاً لصفحات لوحة التحكم وتسجيل الدخول)
  { key: "X-Frame-Options", value: "DENY" },
  // يمنع المتصفح من "تخمين" نوع الملف بعكس ما يعلنه الخادم
  { key: "X-Content-Type-Options", value: "nosniff" },
  // يحدّ من تسريب الرابط الكامل (بما فيه أي معطيات بالمسار) للمواقع الخارجية
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // تعطيل صلاحيات المتصفح الحساسة التي لا يحتاجها المتجر
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  // HSTS: يجبر المتصفح على HTTPS دائماً بعد أول زيارة ناجحة
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // يمنع تسريب الموقع كمصدر تضمين لموارد مواقع أخرى (يكمّل CORP أدناه)
  { key: "X-DNS-Prefetch-Control", value: "off" },
  // يعزل نوافذ المتصفح الأخرى عن الوصول لهذه الصفحة عبر window.opener
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // يمنع مواقع أخرى من تضمين موارد هذا الموقع مباشرة (صور، سكربتات...)
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  /**
   * CSP: كل الموارد (سكربت/تنسيق/صور/خطوط) مُستضافة محلياً حالياً — لا
   * تحميل من أي نطاق خارجي (لا CDN، لا خطوط جوجل، لا سكربتات تحليلات).
   * 'unsafe-inline' مطلوب لسكربتات Next.js التمهيدية (hydration data) لأنها
   * غير مُوقَّعة بـ nonce في هذا الإعداد. عند ربط ودجت دفع خارجي (Moyasar)
   * لاحقاً يجب إضافة نطاقه صراحة هنا بدل توسيع القاعدة العامة.
   */
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const config: NextConfig = {
  reactStrictMode: true,
  images: {
    // صور المنتجات المُولَّدة SVG محلية — next/image يتطلب هذا الإذن صراحة
    dangerouslyAllowSVG: true,
    contentDispositionType: "inline",
    // لا نحتاج تحميل صور من نطاقات خارجية حالياً — تركها بلا قيود
    // (hostname: "**") يفتح الباب لاستغلال محسّن الصور كوسيط SSRF.
    remotePatterns: [],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default config;
