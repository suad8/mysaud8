"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { createAdminUserAction, toggleAdminUserActiveAction } from "@/server/auth/actions";
import { ADMIN_ROLE_LABEL } from "@/lib/constants";

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt: Date | null;
};

export function AdminUsersManager({ users, currentUserId, canManage }: { users: AdminUserRow[]; currentUserId: string; canManage: boolean }) {
  const [state, formAction, isPending] = useActionState(createAdminUserAction, {});

  return (
    <div className="space-y-4">
      <div className="space-y-2.5">
        {users.map((u) => (
          <div key={u.id} className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm">
            <div className="min-w-0">
              <p className="truncate font-medium">
                {u.name} {u.id === currentUserId && <span className="text-xs text-muted">(أنت)</span>}
              </p>
              <p className="truncate text-xs text-muted" dir="ltr">{u.email}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="rounded-full bg-[var(--surface-sunken)] px-2.5 py-1 text-xs font-medium">
                {ADMIN_ROLE_LABEL[u.role] ?? u.role}
              </span>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  u.isActive
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                }`}
              >
                {u.isActive ? "نشط" : "معطّل"}
              </span>
              {canManage && u.id !== currentUserId && (
                <form action={toggleAdminUserActiveAction.bind(null, u.id)}>
                  <button type="submit" className="text-xs font-medium text-brand-700 hover:underline">
                    {u.isActive ? "تعطيل" : "تفعيل"}
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>

      {canManage ? (
        <form action={formAction} className="space-y-3 border-t pt-4">
          {state.error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200 dark:bg-red-950 dark:text-red-300">
              {state.error}
            </div>
          )}
          {state.success && (
            <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300">
              تم إنشاء الحساب بنجاح
            </div>
          )}
          <p className="text-xs font-semibold text-muted">إضافة مستخدم جديد</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              name="name"
              placeholder="الاسم"
              required
              className="h-11 w-full rounded-xl border bg-transparent px-3.5 text-sm outline-none focus:ring-2 focus:ring-brand-500/40"
            />
            <input
              name="email"
              type="email"
              placeholder="البريد الإلكتروني"
              required
              dir="ltr"
              className="num h-11 w-full rounded-xl border bg-transparent px-3.5 text-sm outline-none focus:ring-2 focus:ring-brand-500/40"
            />
            <input
              name="password"
              type="password"
              placeholder="كلمة المرور (8 أحرف على الأقل)"
              required
              minLength={8}
              dir="ltr"
              className="num h-11 w-full rounded-xl border bg-transparent px-3.5 text-sm outline-none focus:ring-2 focus:ring-brand-500/40"
            />
            <select
              name="role"
              defaultValue="STAFF"
              className="h-11 w-full rounded-xl border bg-transparent px-3.5 text-sm outline-none focus:ring-2 focus:ring-brand-500/40"
            >
              <option value="STAFF">موظف</option>
              <option value="MANAGER">مدير</option>
              <option value="OWNER">مالك</option>
            </select>
          </div>
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? "جارٍ الإنشاء…" : "+ إنشاء مستخدم"}
            </Button>
          </div>
        </form>
      ) : (
        <p className="border-t pt-4 text-xs text-muted">إدارة المستخدمين متاحة لحساب المالك فقط.</p>
      )}
    </div>
  );
}
