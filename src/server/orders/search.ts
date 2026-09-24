import type { OrderStatus, Prisma } from "@prisma/client";
import { normalizePhone } from "@/lib/phone";

/** شرط البحث في الطلبات (صفحة الطلبات والتصدير): الحالة + رقم الطلب أو الجوال أو اسم العميل. */
export function orderSearchWhere({ status, q }: { status: OrderStatus | "ALL"; q: string }): Prisma.OrderWhereInput {
  const term = q.trim().slice(0, 100);
  const phone = normalizePhone(term);
  return {
    ...(status !== "ALL" ? { status } : {}),
    ...(term
      ? {
          OR: [
            { number: { contains: term, mode: "insensitive" } },
            { phone: { contains: phone ?? term } },
            { shipToName: { contains: term, mode: "insensitive" } },
            { customer: { name: { contains: term, mode: "insensitive" } } },
          ],
        }
      : {}),
  };
}
