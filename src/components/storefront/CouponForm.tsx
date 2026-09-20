"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { applyCouponAction, removeCouponAction, type CartActionState } from "@/server/cart/actions";

export function CouponForm({ appliedCode }: { appliedCode: string | null }) {
  const [state, formAction, isPending] = useActionState(applyCouponAction, {} as CartActionState);

  if (appliedCode) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2.5 text-sm dark:border-brand-800 dark:bg-brand-950">
        <span className="font-medium text-brand-700 dark:text-brand-300">
          الكود <span className="num">{appliedCode}</span> مُطبَّق
        </span>
        <form action={removeCouponAction}>
          <button type="submit" className="text-xs font-medium text-muted hover:text-red-600">إزالة</button>
        </form>
      </div>
    );
  }

  return (
    <form action={formAction}>
      <div className="flex gap-2">
        <input
          name="code"
          placeholder="كود الخصم"
          dir="ltr"
          className="num h-10 flex-1 rounded-lg border bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-brand-500/40"
        />
        <Button type="submit" variant="secondary" size="sm" className="h-10" disabled={isPending}>
          {isPending ? "…" : "تطبيق"}
        </Button>
      </div>
      {state.error && <p className="mt-1.5 text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
