"use client";

import { useActionState } from "react";
import { subscribeNewsletterAction, type NewsletterState } from "@/server/newsletter/actions";

export function NewsletterForm() {
  const [state, formAction, isPending] = useActionState<NewsletterState, FormData>(subscribeNewsletterAction, {});

  if (state.success) {
    return <p className="text-sm font-semibold text-emerald-600">تم الاشتراك بنجاح ✓</p>;
  }

  return (
    <form action={formAction} className="w-full max-w-sm">
      <div className="flex gap-2">
        <input
          type="email"
          name="email"
          required
          placeholder="بريدك الإلكتروني"
          className="h-12 flex-1 rounded-full border bg-[var(--surface-raised)] px-5 text-sm outline-none focus:ring-2 focus:ring-brand-500/40"
        />
        <button
          type="submit"
          disabled={isPending}
          className="h-12 shrink-0 rounded-full bg-accent-500 px-6 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-400 disabled:opacity-60"
        >
          {isPending ? "…" : "اشتراك"}
        </button>
      </div>
      {state.error && <p className="mt-2 text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
