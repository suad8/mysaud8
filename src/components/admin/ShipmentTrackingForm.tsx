"use client";

import { Button } from "@/components/ui/Button";
import { updateShipmentTrackingAction } from "@/server/orders/actions";

export type ShipmentInfo = {
  carrier: string;
  trackingNo: string | null;
  trackingUrl: string | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
};

export function ShipmentTrackingForm({ orderId, shipment }: { orderId: string; shipment: ShipmentInfo }) {
  return (
    <form action={updateShipmentTrackingAction.bind(null, orderId)} className="space-y-3">
      <label className="block text-sm">
        <span className="mb-1.5 block text-xs font-medium text-muted">شركة الشحن</span>
        <input
          name="carrier"
          defaultValue={shipment.carrier}
          className="h-10 w-full rounded-xl border bg-transparent px-3.5 text-sm outline-none focus:ring-2 focus:ring-brand-500/40"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block text-xs font-medium text-muted">رقم التتبّع</span>
        <input
          name="trackingNo"
          defaultValue={shipment.trackingNo ?? ""}
          dir="ltr"
          className="num h-10 w-full rounded-xl border bg-transparent px-3.5 text-sm outline-none focus:ring-2 focus:ring-brand-500/40"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1.5 block text-xs font-medium text-muted">رابط التتبّع (اختياري)</span>
        <input
          name="trackingUrl"
          defaultValue={shipment.trackingUrl ?? ""}
          dir="ltr"
          className="num h-10 w-full rounded-xl border bg-transparent px-3.5 text-sm outline-none focus:ring-2 focus:ring-brand-500/40"
        />
      </label>
      <div className="flex justify-end">
        <Button type="submit" size="sm">حفظ بيانات الشحنة</Button>
      </div>
    </form>
  );
}
