"use client";

import { useActionState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatNumber } from "@/lib/format";
import {
  createShippingRateAction,
  createShippingZoneAction,
  deleteShippingRateAction,
  deleteShippingZoneAction,
  toggleShippingRateActiveAction,
  toggleShippingZoneActiveAction,
} from "@/server/shipping/actions";

export type RateRow = {
  id: string;
  nameAr: string;
  price: number;
  freeAbove: number | null;
  minDays: number | null;
  maxDays: number | null;
  isActive: boolean;
};

export type ZoneRow = {
  id: string;
  nameAr: string;
  cities: string[];
  isActive: boolean;
  rates: RateRow[];
};

function RateForm({ zoneId }: { zoneId: string }) {
  return (
    <form action={createShippingRateAction.bind(null, zoneId)} className="grid gap-2 sm:grid-cols-5">
      <input name="nameAr" placeholder="اسم السعر (توصيل عادي...)" required className="h-9 rounded-lg border bg-transparent px-3 text-xs outline-none focus:ring-2 focus:ring-brand-500/40 sm:col-span-2" />
      <input name="price" type="number" step="0.01" min="0" placeholder="السعر" required dir="ltr" className="num h-9 rounded-lg border bg-transparent px-3 text-xs outline-none focus:ring-2 focus:ring-brand-500/40" />
      <input name="freeAbove" type="number" step="0.01" min="0" placeholder="مجاني فوق (اختياري)" dir="ltr" className="num h-9 rounded-lg border bg-transparent px-3 text-xs outline-none focus:ring-2 focus:ring-brand-500/40" />
      <button type="submit" className="h-9 rounded-lg bg-brand-700 text-xs font-semibold text-white hover:bg-brand-800">+ إضافة سعر</button>
    </form>
  );
}

function ZoneCard({ zone }: { zone: ZoneRow }) {
  return (
    <div className="surface-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">{zone.nameAr}</h3>
            <Badge tone={zone.isActive ? "green" : "gray"}>{zone.isActive ? "فعّالة" : "متوقفة"}</Badge>
          </div>
          <p className="mt-1 text-xs text-muted">{zone.cities.join("، ")}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <form action={toggleShippingZoneActiveAction.bind(null, zone.id)}>
            <button type="submit" className="text-xs font-medium text-brand-700 hover:underline">
              {zone.isActive ? "تعطيل" : "تفعيل"}
            </button>
          </form>
          <form action={deleteShippingZoneAction.bind(null, zone.id)}>
            <button type="submit" className="text-xs font-medium text-red-600 hover:underline">حذف</button>
          </form>
        </div>
      </div>

      <div className="mt-4 space-y-2 border-t pt-4">
        {zone.rates.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-sm">
            <div>
              <p className="font-medium">{r.nameAr}</p>
              <p className="num text-xs text-muted">
                {r.price.toFixed(2)} ر.س
                {r.freeAbove != null && ` · مجاني فوق ${formatNumber(r.freeAbove)} ر.س`}
                {(r.minDays || r.maxDays) && ` · ${r.minDays ?? "?"}–${r.maxDays ?? "?"} أيام`}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <Badge tone={r.isActive ? "green" : "gray"}>{r.isActive ? "فعّال" : "متوقف"}</Badge>
              <form action={toggleShippingRateActiveAction.bind(null, r.id)}>
                <button type="submit" className="text-xs font-medium text-brand-700 hover:underline">
                  {r.isActive ? "تعطيل" : "تفعيل"}
                </button>
              </form>
              <form action={deleteShippingRateAction.bind(null, r.id)}>
                <button type="submit" className="text-xs font-medium text-red-600 hover:underline">حذف</button>
              </form>
            </div>
          </div>
        ))}
        {zone.rates.length === 0 && <p className="text-xs text-muted">لا توجد أسعار شحن لهذه المنطقة بعد.</p>}
      </div>

      <div className="mt-4 border-t pt-4">
        <RateForm zoneId={zone.id} />
      </div>
    </div>
  );
}

export function ShippingZonesManager({ zones }: { zones: ZoneRow[] }) {
  const [state, formAction, isPending] = useActionState(createShippingZoneAction, {});

  return (
    <div className="space-y-6">
      {zones.map((zone) => (
        <ZoneCard key={zone.id} zone={zone} />
      ))}

      <div className="surface-card p-5">
        <h2 className="text-sm font-semibold">+ منطقة شحن جديدة</h2>
        <form action={formAction} className="mt-4 space-y-3">
          {state.error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200 dark:bg-red-950 dark:text-red-300">
              {state.error}
            </div>
          )}
          <input
            name="nameAr"
            placeholder="اسم المنطقة (مثال: المدن الرئيسية)"
            required
            className="h-11 w-full rounded-xl border bg-transparent px-3.5 text-sm outline-none focus:ring-2 focus:ring-brand-500/40"
          />
          <textarea
            name="cities"
            placeholder="المدن المشمولة، مدينة في كل سطر أو مفصولة بفاصلة (مثال: الرياض، جدة، الدمام)"
            rows={3}
            required
            className="w-full rounded-xl border bg-transparent px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500/40"
          />
          <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? "جارٍ الإنشاء…" : "+ إنشاء منطقة"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
