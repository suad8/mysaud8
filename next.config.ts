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
