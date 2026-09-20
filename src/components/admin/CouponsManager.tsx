"use client";

import { useActionState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDate, formatNumber } from "@/lib/format";
import { createCouponAction, deleteCouponAction, toggleCouponActiveAction } from "@/server/discounts/actions";

const TYPE_LABEL: Record<string, string> = {
  PERCENTAGE: "نسبة مئوية",
  FIXED: "مبلغ ثابت",
  FREE_SHIPPING: "شحن مجاني",
};

export type CouponRow = {
  id: string;
  code: string;
  type: string;
  value: number;
  usageCount: number;
  usageLimit: number | null;
  isActive: boolean;
  createdAt: Date;
};

export function CouponsManager({ coupons }: { coupons: CouponRow[] }) {
  const [state, formAction, isPending] = useActionState(createCouponAction, {});

  return (
    <div className="space-y-6">
      <div className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted">
                <th className="px-5 py-3 text-start font-medium">الكود</th>
                <th className="px-5 py-3 text-start font-medium">النوع</th>
                <th className="px-5 py-3 text-start font-medium">القيمة</th>
                <th className="px-5 py-3 text-start font-medium">الاستخدام</th>
                <th className="px-5 py-3 text-start font-medium">الحالة</th>
                <th className="px-5 py-3 text-start font-medium">أُنشئ</th>
                <th className="px-5 py-3 text-start font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c.id} className="border-t transition-colors hover:bg-ink-50 dark:hover:bg-ink-800/40">
                  <td className="num px-5 py-3 font-semibold">{c.code}</td>
                  <td className="px-5 py-3 text-muted">{TYPE_LABEL[c.type]}</td>
                  <td className="num px-5 py-3">
                    {c.type === "PERCENTAGE" ? `${c.value}%` : c.type === "FIXED" ? `${c.value} ر.س` : "—"}
                  </td>
                  <td className="num px-5 py-3 text-muted">
                    {c.usageCount}{c.usageLimit ? ` / ${formatNumber(c.usageLimit)}` : ""}
                  </td>
                  <td className="px-5 py-3">
                    <Badge tone={c.isActive ? "green" : "gray"}>{c.isActive ? "فعّال" : "متوقف"}</Badge>
                  </td>
                  <td className="px-5 py-3 text-xs text-muted">{formatDate(c.createdAt)}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <form action={toggleCouponActiveAction.bind(null, c.id)}>
                        <button type="submit" className="text-xs font-medium text-brand-700 hover:underline">
                          {c.isActive ? "تعطيل" : "تفعيل"}
                        </button>
                      </form>
                      <form action={deleteCouponAction.bind(null, c.id)}>
                        <button type="submit" className="text-xs font-medium text-red-600 hover:underline">
                          حذف
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {coupons.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-muted">
                    لا توجد كوبونات بعد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="surface-card p-5">
        <h2 className="text-sm font-semibold">+ كوبون جديد</h2>
        <form action={formAction} className="mt-4 space-y-4">
          {state.error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200 dark:bg-red-950 dark:text-red-300">
              {state.error}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-muted">الكود</span>
              <input
                name="code"
                required
                dir="ltr"
                placeholder="WELCOME10"
                className="num h-11 w-full rounded-xl border bg-transparent px-3.5 outline-none focus:ring-2 focus:ring-brand-500/40"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-muted">النوع</span>
              <select
                name="type"
                defaultValue="PERCENTAGE"
                className="h-11 w-full rounded-xl border bg-transparent px-3.5 outline-none focus:ring-2 focus:ring-brand-500/40"
              >
                <option value="PERCENTAGE">نسبة مئوية</option>
                <option value="FIXED">مبلغ ثابت</option>
                <option value="FREE_SHIPPING">شحن مجاني</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-muted">القيمة</span>
              <input
                name="value"
                type="number"
                step="0.01"
                min="0"
                dir="ltr"
                placeholder="10"
                className="num h-11 w-full rounded-xl border bg-transparent px-3.5 outline-none focus:ring-2 focus:ring-brand-500/40"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-muted">حد الاستخدام (اختياري)</span>
              <input
                name="usageLimit"
                type="number"
                min="1"
                dir="ltr"
                className="num h-11 w-full rounded-xl border bg-transparent px-3.5 outline-none focus:ring-2 focus:ring-brand-500/40"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-muted">الحد الأدنى للسلة (اختياري)</span>
              <input
                name="minSubtotal"
                type="number"
                step="0.01"
                min="0"
                dir="ltr"
                className="num h-11 w-full rounded-xl border bg-transparent px-3.5 outline-none focus:ring-2 focus:ring-brand-500/40"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-muted">أقصى خصم بالريال (للنسبة المئوية فقط)</span>
              <input
                name="maxDiscount"
                type="number"
                step="0.01"
                min="0"
                dir="ltr"
                className="num h-11 w-full rounded-xl border bg-transparent px-3.5 outline-none focus:ring-2 focus:ring-brand-500/40"
              />
            </label>
            <label className="flex items-center gap-2.5 self-end pb-2.5 text-sm">
              <input type="checkbox" name="isActive" defaultChecked className="h-4 w-4 accent-brand-600" />
              تفعيل فور الإنشاء
            </label>
          </div>
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? "جارٍ الإنشاء…" : "+ إنشاء كوبون"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
