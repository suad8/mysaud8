"use client";

import { useEffect, useState } from "react";
import { bulkProductsAction } from "@/server/products/actions";

export const BULK_FORM_ID = "bulk-products";

const OPS: { op: string; label: string; danger?: boolean; confirm?: string }[] = [
  { op: "publish", label: "نشر" },
  { op: "hide", label: "إخفاء" },
  { op: "feature", label: "⭐ تمييز" },
  { op: "unfeature", label: "إلغاء التمييز" },
  { op: "archive", label: "أرشفة", confirm: "أرشفة المنتجات المحددة؟ ستختفي من المتجر (يمكن إعادة نشرها لاحقاً)." },
  { op: "delete", label: "حذف", danger: true, confirm: "حذف المنتجات المحددة؟ تختفي من كل مكان، وتبقى سجلات الطلبات القديمة سليمة." },
];

const boxes = () => [...document.querySelectorAll<HTMLInputElement>(`input[name="ids"][form="${BULK_FORM_ID}"]`)];

/** شريط الإجراءات الجماعية: يظهر عند تحديد منتج أو أكثر من مربعات الاختيار في الجدول. */
export function ProductsBulkBar() {
  const [count, setCount] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const sync = () => {
      const all = boxes();
      setTotal(all.length);
      setCount(all.filter((b) => b.checked).length);
    };
    sync();
    document.addEventListener("change", sync);
    return () => document.removeEventListener("change", sync);
  }, []);

  const toggleAll = (checked: boolean) => {
    boxes().forEach((b) => (b.checked = checked));
    setCount(checked ? boxes().length : 0);
  };

  return (
    <form
      id={BULK_FORM_ID}
      action={bulkProductsAction}
      onSubmit={(e) => {
        const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
        const message = OPS.find((o) => o.op === submitter?.value)?.confirm;
        if (message && !window.confirm(message)) e.preventDefault();
      }}
      className="flex flex-wrap items-center gap-2 border-b bg-[var(--surface-sunken)] px-4 py-2.5 text-sm"
    >
      <label className="flex items-center gap-2 text-xs font-medium">
        <input
          type="checkbox"
          aria-label="تحديد كل المنتجات"
          checked={total > 0 && count === total}
          onChange={(e) => toggleAll(e.target.checked)}
          className="h-4 w-4 accent-brand-600"
        />
        {count > 0 ? <span className="num">تم تحديد {count}</span> : "تحديد الكل"}
      </label>
      {count > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {OPS.map((o) => (
            <button
              key={o.op}
              type="submit"
              name="op"
              value={o.op}
              className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${o.danger ? "border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950" : "bg-[var(--surface-raised)] hover:bg-ink-100 dark:hover:bg-ink-800"}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </form>
  );
}
