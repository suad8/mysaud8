"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { ADMIN_NAV } from "@/components/admin/nav";
import { ADMIN_ROLE_LABEL } from "@/lib/constants";
import { logoutAction } from "@/server/auth/actions";
import type { SessionPayload } from "@/server/auth/session";

export function Sidebar({ session }: { session: SessionPayload }) {
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
        {ADMIN_NAV.filter((item) => !("ownerOnly" in item && item.ownerOnly) || session.role === "OWNER").map((item) => {
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

      <div className="space-y-1 border-t p-3">
        <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-900 dark:text-brand-300">
            {session.name.slice(0, 1)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold leading-tight">{session.name}</p>
            <p className="text-[11px] text-muted leading-tight">{ADMIN_ROLE_LABEL[session.role] ?? session.role}</p>
          </div>
        </div>

        <Link href="/" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted hover:bg-ink-100 dark:hover:bg-ink-800">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0 stroke-current">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          عودة للمتجر
        </Link>

        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
          >
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0 stroke-current">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            تسجيل الخروج
          </button>
        </form>
      </div>
    </aside>
  );
}
