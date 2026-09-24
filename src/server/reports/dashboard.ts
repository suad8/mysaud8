import { db } from "@/server/db";
import { OrderStatus } from "@prisma/client";

/** الأيام بتوقيت السعودية (UTC+3) — «اليوم» يبدأ منتصف الليل في الرياض لا حسب ساعة الخادم. */
const RIYADH_OFFSET = 3 * 3_600_000;
const DAY = 86_400_000;
const startOfDay = (d: Date) => new Date(Math.floor((d.getTime() + RIYADH_OFFSET) / DAY) * DAY - RIYADH_OFFSET);
const daysAgo = (n: number) => startOfDay(new Date(Date.now() - n * DAY));
const riyadhDateLabel = (d: Date) => new Date(d.getTime() + RIYADH_OFFSET).toISOString().slice(5, 10);

const PAID_STATUSES = [OrderStatus.PAID, OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED];

export async function getDashboardStats() {
  const today = daysAgo(0);
  const monthAgo = daysAgo(30);
  const prevMonthAgo = daysAgo(60);

  const hourAgo = new Date(Date.now() - 3_600_000);
  const [thisMonthOrders, prevMonthOrders, todayOrders, pendingCount, lowStock, recentOrders, todayPaid, pendingTransfers, toFulfill, abandonedCarts, topItems] = await Promise.all([
    db.order.findMany({ where: { status: { in: PAID_STATUSES }, placedAt: { gte: monthAgo } }, select: { grandTotal: true } }),
    db.order.findMany({ where: { status: { in: PAID_STATUSES }, placedAt: { gte: prevMonthAgo, lt: monthAgo } }, select: { grandTotal: true } }),
    db.order.count({ where: { placedAt: { gte: today } } }),
    db.order.count({ where: { status: OrderStatus.PENDING } }),
    db.inventoryItem.findMany({
      where: { onHand: { gt: 0 } },
      include: { variant: { include: { product: { select: { nameAr: true, slug: true } } } } },
      orderBy: { onHand: "asc" },
      take: 5,
    }),
    db.order.findMany({
      orderBy: { placedAt: "desc" },
      take: 6,
      include: { customer: { select: { name: true } } },
    }),
    db.order.findMany({ where: { status: { in: PAID_STATUSES }, placedAt: { gte: today } }, select: { grandTotal: true } }),
    // تحويلات بنكية أرفق العميل إيصالها وتنتظر تأكيدك
    db.payment.count({ where: { method: "BANK_TRANSFER", status: "INITIATED", order: { status: OrderStatus.PENDING } } }),
    db.order.count({ where: { status: OrderStatus.PAID } }),
    db.cart.count({ where: { status: "ACTIVE", phone: { not: null }, items: { some: {} }, updatedAt: { gte: daysAgo(7), lt: hourAgo } } }),
    db.orderItem.groupBy({
      by: ["productId"],
      where: { productId: { not: null }, order: { status: { in: PAID_STATUSES }, placedAt: { gte: monthAgo } } },
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
  ]);
  const topProductRows = await db.product.findMany({
    where: { id: { in: topItems.map((t) => t.productId).filter((id): id is string => id !== null) } },
    select: { id: true, nameAr: true, images: { select: { url: true }, orderBy: { position: "asc" }, take: 1 } },
  });
  const topProducts = topItems.map((t) => {
    const p = topProductRows.find((r) => r.id === t.productId);
    return { id: t.productId ?? "", nameAr: p?.nameAr ?? "منتج محذوف", imageUrl: p?.images[0]?.url ?? null, quantity: t._sum.quantity ?? 0, revenue: Number(t._sum.lineTotal ?? 0) };
  });

  const sum = (rows: { grandTotal: unknown }[]) => rows.reduce((s, r) => s + Number(r.grandTotal), 0);
  const revenue30d = sum(thisMonthOrders);
  const revenuePrev30d = sum(prevMonthOrders);
  const revenueDelta = revenuePrev30d > 0 ? ((revenue30d - revenuePrev30d) / revenuePrev30d) * 100 : 0;

  const ordersCount30d = thisMonthOrders.length;
  const ordersCountPrev30d = prevMonthOrders.length;
  const ordersDelta = ordersCountPrev30d > 0 ? ((ordersCount30d - ordersCountPrev30d) / ordersCountPrev30d) * 100 : 0;

  const aov30d = ordersCount30d > 0 ? revenue30d / ordersCount30d : 0;

  // مبيعات آخر 14 يوماً للرسم البياني
  const salesByDay: { date: string; total: number }[] = [];
  const paidLast14 = await db.order.findMany({
    where: { status: { in: PAID_STATUSES }, placedAt: { gte: daysAgo(13) } },
    select: { placedAt: true, grandTotal: true },
  });
  for (let i = 13; i >= 0; i--) {
    const day = daysAgo(i);
    const next = daysAgo(i - 1);
    const total = paidLast14
      .filter((o) => o.placedAt >= day && o.placedAt < next)
      .reduce((s, o) => s + Number(o.grandTotal), 0);
    salesByDay.push({ date: riyadhDateLabel(day), total: Math.round(total) });
  }

  const lowStockItems = lowStock
    .filter((i) => i.onHand - i.reserved <= i.lowStockAt)
    .map((i) => ({
      nameAr: i.variant.product.nameAr,
      slug: i.variant.product.slug,
      available: i.onHand - i.reserved,
    }));

  return {
    revenue30d,
    revenueDelta,
    ordersCount30d,
    ordersDelta,
    aov30d,
    todayOrders,
    todayRevenue: sum(todayPaid),
    pendingCount,
    pendingTransfers,
    toFulfill,
    abandonedCarts,
    topProducts,
    lowStockItems,
    salesByDay,
    recentOrders: recentOrders.map((o) => ({
      id: o.id,
      number: o.number,
      customerName: o.customer?.name ?? o.shipToName,
      status: o.status,
      total: Number(o.grandTotal),
      placedAt: o.placedAt,
    })),
  };
}
