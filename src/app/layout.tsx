import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";

// خط عريض مدوّر — يمنح العناوين طابعاً عصرياً واثقاً يناسب متجر منتجات.
const arabic = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-arabic",
  display: "swap",
});

// المتجر ولوحة التحكم يعرضان بيانات حيّة من قاعدة البيانات (مخزون، أسعار،
// طلبات). تعطيل التوليد الثابت وقت البناء يمنع Next.js من محاولة الاتصال
// بقاعدة البيانات أثناء `next build` (حيث DATABASE_URL غالباً غير متاح على
// منصات النشر مثل Railway/Vercel)، ويضمن أن كل صفحة تُعرض بأحدث البيانات
// عند كل طلب بدل تجميدها وقت البناء.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "فنجان — قهوة مختصة وماتشا فاخرة", template: "%s · فنجان" },
  description: "فنجان: حبوب قهوة محمّصة طازجة، ماتشا يابانية فاخرة، وأدوات تحضير مختارة بعناية — توصيل لكل مدن المملكة.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#100e1f" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={arabic.variable}>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
