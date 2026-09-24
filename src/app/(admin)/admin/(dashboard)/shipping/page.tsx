import { Topbar } from "@/components/admin/Topbar";
import { ShippingZonesManager } from "@/components/admin/ShippingZonesManager";
import { db } from "@/server/db";
import { formatNumber } from "@/lib/format";
import { requireAdminPage } from "@/server/auth/session";

export default async function AdminShippingPage() {
  await requireAdminPage();
  const zones = await db.shippingZone.findMany({
    orderBy: { createdAt: "asc" },
    include: { rates: { orderBy: { price: "asc" } } },
  });

  const rows = zones.map((z) => ({
    id: z.id,
    nameAr: z.nameAr,
    cities: z.cities,
    isActive: z.isActive,
    rates: z.rates.map((r) => ({
      id: r.id,
      nameAr: r.nameAr,
      price: Number(r.price),
      freeAbove: r.freeAbove == null ? null : Number(r.freeAbove),
      minDays: r.minDays,
      maxDays: r.maxDays,
      isActive: r.isActive,
    })),
  }));

  return (
    <>
      <Topbar title="الشحن" subtitle={`${formatNumber(zones.length)} منطقة شحن`} />
      <div className="p-5 lg:p-8">
        <ShippingZonesManager zones={rows} />
      </div>
    </>
  );
}
