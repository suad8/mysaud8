"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { changePasswordAction } from "@/server/auth/actions";

export function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState(changePasswordAction, {});

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300">
          تم تغيير كلمة المرور بنجاح
        </div>
      )}

      <label className="block text-sm">
        <span className="mb-1.5 block font-medium text-muted">كلمة المرور الحالية</span>
        <input
          type="password"
          name="currentPassword"
          required
          autoComplete="current-password"
          className="h-11 w-full rounded-xl border bg-transparent px-3.5 outline-none focus:ring-2 focus:ring-brand-500/40"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-muted">كلمة المرور الجديدة</span>
          <input
            type="password"
            name="newPassword"
            required
            minLength={12}
            autoComplete="new-password"
            className="h-11 w-full rounded-xl border bg-transparent px-3.5 outline-none focus:ring-2 focus:ring-brand-500/40"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-muted">تأكيد كلمة المرور</span>
          <input
            type="password"
            name="confirmPassword"
            required
            minLength={12}
            autoComplete="new-password"
            className="h-11 w-full rounded-xl border bg-transparent px-3.5 outline-none focus:ring-2 focus:ring-brand-500/40"
          />
        </label>
      </div>
      <p className="text-[11px] text-muted">12 حرفاً على الأقل. تغييرها يُنهي جلسات الدخول المفتوحة على الأجهزة الأخرى.</p>
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "جارٍ الحفظ…" : "تغيير كلمة المرور"}
        </Button>
      </div>
    </form>
  );
}
