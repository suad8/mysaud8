import type { Metadata, Viewport } from "next";
import { Cairo } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { getSeoMarketingSettings, getStoreInfoSettings, getThemeSettings } from "@/server/settings";
import { themeColorCss } from "@/lib/theme";
import { SITE_URL } from "@/lib/constants";

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

const DEFAULT_DESCRIPTION = "طباعة احترافية لستيكرات وكروت الأعمال والمطبوعات — توصيل لجميع مدن المملكة.";

export async function generateMetadata(): Promise<Metadata> {
  const [storeInfo, seo] = await Promise.all([getStoreInfoSettings(), getSeoMarketingSettings()]);
  const description = storeInfo.tagline ? `${storeInfo.name}: ${storeInfo.tagline}` : DEFAULT_DESCRIPTION;

  return {
    metadataBase: new URL(SITE_URL),
    title: { default: `${storeInfo.name} — ${storeInfo.tagline || DEFAULT_DESCRIPTION}`, template: `%s · ${storeInfo.name}` },
    description,
    // يظهر فقط إذا أُدخل كود التحقق من Search Console في الإعدادات
    verification: seo.googleSearchConsoleVerification ? { google: seo.googleSearchConsoleVerification } : undefined,
    openGraph: {
      type: "website",
      locale: "ar_SA",
      siteName: storeInfo.name,
      title: storeInfo.name,
      description,
      images: storeInfo.logoUrl ? [{ url: storeInfo.logoUrl }] : undefined,
    },
    twitter: {
      card: "summary",
      title: storeInfo.name,
      description,
    },
    icons: storeInfo.logoUrl ? { icon: storeInfo.logoUrl } : undefined,
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#100e1f" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [seo, theme] = await Promise.all([getSeoMarketingSettings(), getThemeSettings()]);
  // ألوان الثيم المخصّصة — قيم hex مُتحقَّق منها قبل إدراجها، وتُحذف كلياً عند استخدام الافتراضية
  const themeCss = themeColorCss(theme.primaryColor, theme.accentColor);

  return (
    <html lang="ar" dir="rtl" className={arabic.variable}>
      <head>{themeCss && <style dangerouslySetInnerHTML={{ __html: themeCss }} />}</head>
      <body className="min-h-dvh font-sans">
        {children}

        {/* Google Analytics 4 — يُحمَّل فقط عند إدخال المعرّف من الإعدادات؛ المعرّف مُتحقَّق الصيغة عند الحفظ */}
        {seo.googleAnalyticsId && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${seo.googleAnalyticsId}`} strategy="afterInteractive" />
            <Script id="ga4-init" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', ${JSON.stringify(seo.googleAnalyticsId)});`}
            </Script>
          </>
        )}

        {/* Google Tag Manager — اختياري، إضافي على GA4 المباشر أعلاه */}
        {seo.googleTagManagerId && (
          <Script id="gtm-init" strategy="afterInteractive">
            {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer',${JSON.stringify(seo.googleTagManagerId)});`}
          </Script>
        )}
      </body>
    </html>
  );
}
