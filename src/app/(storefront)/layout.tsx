import { Header } from "@/components/storefront/Header";
import { Footer } from "@/components/storefront/Footer";
import { MaintenanceScreen } from "@/components/storefront/MaintenanceScreen";
import { getSession } from "@/server/auth/session";
import { FloatingWhatsApp } from "@/components/storefront/FloatingWhatsApp";
import { getMaintenanceSettings, getStoreInfoSettings, getThemeSettings } from "@/server/settings";

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const [maintenance, theme] = await Promise.all([getMaintenanceSettings(), getThemeSettings()]);
  const isAdmin = maintenance.enabled ? Boolean(await getSession()) : false;

  // وضع الصيانة: الميدلوير يحوّل الزائر لصفحة /maintenance قبل تنفيذ أي صفحة؛ هذا خط دفاع ثانٍ
  // (مثلاً رابط فيه نقطة لا يمر بالميدلوير). المدير المسجّل يتصفح المتجر كالمعتاد.
  if (maintenance.enabled && !isAdmin) {
    return <MaintenanceScreen store={await getStoreInfoSettings()} message={maintenance.message} />;
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {maintenance.enabled && (
        <p className="bg-amber-500 px-4 py-1.5 text-center text-xs font-semibold text-ink-900">
          وضع الصيانة مفعّل — الزوار يرون صفحة «نعود قريباً». أنت ترى المتجر لأنك مسجّل دخول كمدير.
        </p>
      )}
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <FloatingWhatsApp number={theme.whatsappFloatNumber} message={theme.whatsappFloatMessage} />
    </div>
  );
}
