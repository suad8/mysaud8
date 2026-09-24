import { NextResponse, type NextRequest } from "next/server";
import type { OrderStatus } from "@prisma/client";
import { db } from "@/server/db";
import { getSession } from "@/server/auth/session";
import { logAudit } from "@/server/audit/log";
import { orderSearchWhere } from "@/server/orders/search";
import { ORDER_STATUS, PAYMENT_METHOD_LABEL, type OrderStatusKey } from "@/lib/constants";

const MAX_ROWS = 5000;

/**
 * خلية CSV آمنة: تنصيص الفواصل والأسطر، ومنع «حقن الصيغ» — نص يبدأ بـ = + - @
 * (مثل اسم عميل خبيث) يُفتح في Excel كصيغة تنفّذ أوامر؛ نسبقه بعلامة ' ليُقرأ نصاً.
 */
function cell(value: unknown): string {
  let s = value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** تصدير الطلبات (حسب البحث والحالة الحاليين) كملف CSV يفتح في Excel بالعربية. */
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return new NextResponse("غير مصرَّح", { status: 401 });

  const params = req.nextUrl.searchParams;
  const rawStatus = params.get("status") ?? "ALL";
  const status = (rawStatus in ORDER_STATUS ? rawStatus : "ALL") as OrderStatus | "ALL";
  const q = (params.get("q") ?? "").slice(0, 100);

  const orders = await db.order.findMany({
    where: orderSearchWhere({ status, q }),
    orderBy: { placedAt: "desc" },
    take: MAX_ROWS,
    include: { items: { select: { nameAr: true, quantity: true } }, payments: { select: { method: true }, take: 1 }, customer: { select: { name: true } } },
  });

  const header = ["رقم الطلب", "التاريخ", "الحالة", "العميل", "الجوال", "البريد", "المدينة", "الحي", "العنوان", "المنتجات", "عدد القطع", "المجموع الفرعي", "الخصم", "كود الخصم", "الشحن", "الضريبة", "الإجمالي", "طريقة الدفع", "الرقم الضريبي للعميل"];
  const lines = orders.map((o) =>
    [
      o.number,
      o.placedAt.toISOString().replace("T", " ").slice(0, 16),
      ORDER_STATUS[o.status as OrderStatusKey]?.label ?? o.status,
      o.customer?.name ?? o.shipToName,
      o.phone,
      o.email,
      o.shipToCity,
      o.shipToDistrict,
      [o.shipToStreet, o.shipToDetails].filter(Boolean).join("، "),
      o.items.map((i) => `${i.nameAr} × ${i.quantity}`).join(" | "),
      o.items.reduce((s, i) => s + i.quantity, 0),
      o.subtotal.toString(),
      o.discountTotal.toString(),
      o.couponCode,
      o.shippingTotal.toString(),
      o.taxTotal.toString(),
      o.grandTotal.toString(),
      o.payments[0] ? (PAYMENT_METHOD_LABEL[o.payments[0].method] ?? o.payments[0].method) : "",
      o.taxNumber,
    ]
      .map(cell)
      .join(","),
  );

  // تصدير بيانات العملاء حدث يستحق التسجيل
  await logAudit({ actorId: session.sub, action: "orders.exported", entity: "Order", diff: { count: orders.length, status, q: q || undefined } });

  const body = "﻿" + [header.map(cell).join(","), ...lines].join("\r\n");
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders-${date}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
