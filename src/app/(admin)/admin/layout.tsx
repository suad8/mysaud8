import { Sidebar } from "@/components/admin/Sidebar";
import { MobileSidebar } from "@/components/admin/MobileSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-[var(--surface)]">
      <Sidebar />
      <MobileSidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
