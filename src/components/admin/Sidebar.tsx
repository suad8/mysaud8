"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/admin", label: "الرئيسية", icon: "M4 12l8-8 8 8M6 10v10h12V10" },
  { href: "/admin/orders", label: "الطلبات", icon: "M4 6h16l-1.4 10.3a2 2 0 0 1-2 1.7H7.4a2 2 0 0 1-2-1.7ZM9 10V6a3 3 0 0 1 6 0v4" },
  { href: "/admin/products", label: "المنتجات", icon: "M20 7L10 2 0 7v10l10 5 10-5zM10 12L0 7m10 5v10m0-10l10-5" },
  { href: "/admin/inventory", label: "المخزون", icon: "M3 7h18M3 12h18M3 17h18" },
  { href: "/admin/customers", label: "العملاء", icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" },
  { href: "/admin/discounts", label: "الخصومات", icon: "M20 12l-8 8-9-9V4h7l10 8ZM7 7h.01" },
  { href: "/admin/reports", label: "التقارير", icon: "M4 20V10m6 10V4m6 16v-7" },
  { href: "/admin/settings", label: "الإعدادات", icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1c.6.5 1.3.9 2 1.2L10 21h4l.5-2.6c.7-.3 1.4-.7 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-e bg-[var(--surface-raised)] lg:flex">
      <div className="flex h-16 items-center gap-2.5 border-b px-5">
        <span className="grid h-9 w-9 place-items-center rounded-2xl bg-brand-700 text-lg font-bold text-white">ف</span>
        <div>
          <p className="text-sm font-bold leading-tight">فنجان</p>
          <p className="text-[11px] text-muted leading-tight">لوحة التحكم</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV.map((item) => {
          const active = item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-700 text-white"
                  : "text-muted hover:bg-ink-100 hover:text-[var(--text-strong)] dark:hover:bg-ink-800",
              )}
            >
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
                <path d={item.icon} />
              </svg>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-3">
        <Link href="/" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted hover:bg-ink-100 dark:hover:bg-ink-800">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          عودة للمتجر
        </Link>
      </div>
    </aside>
  );
}
