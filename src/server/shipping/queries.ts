import { db } from "@/server/db";
import type { ShippingZoneWithRates } from "@/server/shipping/match";

export async function getActiveShippingZones(): Promise<ShippingZoneWithRates[]> {
  const zones = await db.shippingZone.findMany({
    where: { isActive: true },
    include: { rates: { where: { isActive: true }, orderBy: { price: "asc" } } },
    orderBy: { createdAt: "asc" },
  });

  return zones
    .filter((z) => z.rates.length > 0)
    .map((z) => ({
      id: z.id,
      nameAr: z.nameAr,
      cities: z.cities,
      rates: z.rates.map((r) => ({
        id: r.id,
        nameAr: r.nameAr,
        price: Number(r.price),
        freeAbove: r.freeAbove == null ? null : Number(r.freeAbove),
        minDays: r.minDays,
        maxDays: r.maxDays,
      })),
    }));
}
