import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MaintenanceScreen } from "@/components/storefront/MaintenanceScreen";
import { getMaintenanceSettings, getStoreInfoSettings } from "@/server/settings";

export const metadata: Metadata = { title: "نعود قريباً" };

/** يُعرض بدل صفحات المتجر أثناء الصيانة (الميدلوير يعيد توجيه الزائر إليه داخلياً دون تغيير الرابط). */
export default async function MaintenancePage() {
  const [maintenance, store] = await Promise.all([getMaintenanceSettings(), getStoreInfoSettings()]);
  if (!maintenance.enabled) redirect("/");
  return <MaintenanceScreen store={store} message={maintenance.message} />;
}
