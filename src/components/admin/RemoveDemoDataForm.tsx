"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { removeDemoDataAction, type RemoveDemoState } from "@/server/demo/actions";

export function RemoveDemoDataForm({ summary }: { summary: string[] }) {
  const [state, formAction, isPending] = useActionState<RemoveDemoState, FormData>(removeDemoDataAction, {});
  const [confirmed, setConfirmed] = useState(false);

  if (state.done) {
    return <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">{state.done}</p>;
  }

  return (
    <form action={formAction} className="space-y-3">
      <ul className="list-inside list-disc text-sm text-muted">
        {summary.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <p className="text-xs text-muted">
        يُحذف فقط ما أضافه العرض التجريبي (منتجات متجر القهوة وتقييماتها وعملاؤها الوهميون). منتجاتك وطلباتك الحقيقية لا تُمس.
      </p>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="confirm" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="h-4 w-4 accent-brand-600" />
        أفهم أن الحذف نهائي ولا يمكن التراجع عنه
      </label>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" size="sm" variant="danger" disabled={!confirmed || isPending}>
        {isPending ? "جارٍ الحذف…" : "حذف البيانات التجريبية"}
      </Button>
    </form>
  );
}
