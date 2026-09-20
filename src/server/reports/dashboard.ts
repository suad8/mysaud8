import { db } from "@/server/db";
import { OrderStatus } from "@prisma/client";

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const daysAgo = (n: number) => startOfDay(new Date(Date.now() - n * 86_400_000));

const PAID_STATUSES = [OrderStatus.PAID, OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED];

export async function getDashboardStats() {
  const today = daysAgo(0);
  const monthAgo = daysAgo(30);
  const prevMonthAgo = daysAgo(60);

  const [thisMonthOrders, prevMonthOrders, todayOrders, pendingCount, lowStock, recentOrders] = await Promise.all([
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
  ]);

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
    salesByDay.push({ date: day.toISOString().slice(5, 10), total: Math.round(total) });
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
    pendingCount,
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
