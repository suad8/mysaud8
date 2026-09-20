"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { ADMIN_NAV } from "@/components/admin/nav";
import { ADMIN_ROLE_LABEL } from "@/lib/constants";
import { logoutAction } from "@/server/auth/actions";
import type { SessionPayload } from "@/server/auth/session";

/**
 * تنقّل لوحة التحكم على الجوال: زر همبرغر عائم + قائمة منسدلة من الجانب.
 * الشريط الجانبي الثابت (Sidebar.tsx) مخفي تحت lg، فهذا المكوّن يعوّضه.
 */
export function MobileSidebar({ session }: { session: SessionPayload }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // إغلاق القائمة تلقائياً عند تغيّر الصفحة (بعد الضغط على رابط)
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // إغلاق بمفتاح Escape ومنع تمرير الصفحة خلف القائمة المفتوحة
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="فتح قائمة التنقل"
        className="fixed top-3 start-3 z-50 grid h-11 w-11 place-items-center rounded-xl bg-[var(--surface-raised)] shadow-[var(--shadow-soft)] ring-1 ring-[var(--border-subtle)] lg:hidden"
      >
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" className="h-5 w-5 stroke-current">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      {/* الخلفية المعتمة */}
      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px] transition-opacity lg:hidden",
          open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      {/* القائمة المنسدلة */}
      <aside
        role="dialog"
        aria-modal="true"
        className={cn(
          "fixed inset-y-0 start-0 z-50 flex w-72 max-w-[85vw] flex-col bg-[var(--surface-raised)] shadow-[var(--shadow-lift)] transition-transform duration-200 lg:hidden",
          open ? "translate-x-0" : "-translate-x-full rtl:translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between gap-2.5 border-b px-5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-2xl bg-brand-700 text-lg font-bold text-white">ف</span>
            <div>
              <p className="text-sm font-bold leading-tight">فنجان</p>
              <p className="text-[11px] text-muted leading-tight">لوحة التحكم</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="إغلاق القائمة"
            className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-ink-100 dark:hover:bg-ink-800"
          >
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" className="h-5 w-5 stroke-current">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
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
    </>
  );
}
