import { redirect } from "next/navigation";
import { Sidebar } from "@/components/admin/Sidebar";
import { MobileSidebar } from "@/components/admin/MobileSidebar";
import { getSession } from "@/server/auth/session";
import { getStoreInfoSettings } from "@/server/settings";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  // الميدلوير هو الحارس الأساسي؛ هذا تحقّق دفاعي إضافي فقط
  if (!session) redirect("/admin/login");

  const storeInfo = await getStoreInfoSettings();

  return (
    <div className="flex min-h-dvh bg-[var(--surface)]">
      <Sidebar session={session} storeInfo={storeInfo} />
      <MobileSidebar session={session} storeInfo={storeInfo} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
