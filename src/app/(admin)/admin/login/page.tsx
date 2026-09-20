"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { loginAction, type LoginState } from "@/server/auth/actions";

const initialState: LoginState = {};

export default function AdminLoginPage() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/admin";
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--surface)] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2.5">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-700 text-2xl font-bold text-white">ف</span>
          <div className="text-center">
            <p className="text-lg font-bold">فنجان</p>
            <p className="text-sm text-muted">لوحة التحكم</p>
          </div>
        </div>

        <form action={formAction} className="surface-card space-y-4 p-6">
          <h1 className="text-center text-base font-semibold">تسجيل الدخول</h1>

          {state.error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200 dark:bg-red-950 dark:text-red-300">
              {state.error}
            </div>
          )}

          <input type="hidden" name="next" value={next} />

          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-muted">البريد الإلكتروني</span>
            <input
              type="email"
              name="email"
              defaultValue={state.email ?? ""}
              required
              autoFocus
              dir="ltr"
              className="h-11 w-full rounded-xl border bg-transparent px-3.5 text-end outline-none focus:ring-2 focus:ring-brand-500/40"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-muted">كلمة المرور</span>
            <input
              type="password"
              name="password"
              required
              dir="ltr"
              className="h-11 w-full rounded-xl border bg-transparent px-3.5 text-end outline-none focus:ring-2 focus:ring-brand-500/40"
            />
          </label>

          <button
            type="submit"
            disabled={isPending}
            className="h-11 w-full rounded-full bg-brand-700 text-sm font-semibold text-white transition-colors hover:bg-brand-800 disabled:opacity-50"
          >
            {isPending ? "جارٍ التحقق…" : "دخول"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted">هذه اللوحة مخصّصة لفريق المتجر فقط</p>
      </div>
    </div>
  );
}
