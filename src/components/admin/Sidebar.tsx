"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { ADMIN_NAV } from "@/components/admin/nav";

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
        {ADMIN_NAV.map((item) => {
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
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0 stroke-current">
                <path d={item.icon} />
              </svg>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-3">
        <Link href="/" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted hover:bg-ink-100 dark:hover:bg-ink-800">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0 stroke-current">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          عودة للمتجر
        </Link>
      </div>
    </aside>
  );
}
