import { redirect } from "next/navigation";
import { Sidebar } from "@/components/admin/Sidebar";
import { MobileSidebar } from "@/components/admin/MobileSidebar";
import { getSession } from "@/server/auth/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  // الميدلوير هو الحارس الأساسي؛ هذا تحقّق دفاعي إضافي فقط
  if (!session) redirect("/admin/login");

  return (
    <div className="flex min-h-dvh bg-[var(--surface)]">
      <Sidebar session={session} />
      <MobileSidebar session={session} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
