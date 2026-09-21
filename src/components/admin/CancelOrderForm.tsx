"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { cancelOrderAction } from "@/server/orders/actions";

export function CancelOrderForm({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Button variant="danger" size="sm" type="button" onClick={() => setOpen(true)}>
        إلغاء الطلب
      </Button>
    );
  }

  return (
    <form action={cancelOrderAction.bind(null, orderId)} className="flex items-center gap-2">
      <input
        name="reason"
        placeholder="سبب الإلغاء (اختياري)"
        className="h-9 w-48 rounded-full border bg-transparent px-3.5 text-xs outline-none focus:ring-2 focus:ring-red-400/40"
      />
      <Button variant="danger" size="sm" type="submit">تأكيد الإلغاء</Button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-muted hover:underline">
        تراجع
      </button>
    </form>
  );
}
