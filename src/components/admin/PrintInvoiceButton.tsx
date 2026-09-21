"use client";

import { Button } from "@/components/ui/Button";

export function PrintInvoiceButton() {
  return (
    <Button variant="secondary" size="sm" type="button" onClick={() => window.print()}>
      طباعة الفاتورة
    </Button>
  );
}
