import { Topbar } from "@/components/admin/Topbar";
import { CouponsManager } from "@/components/admin/CouponsManager";
import { db } from "@/server/db";
import { formatNumber } from "@/lib/format";

export default async function AdminDiscountsPage() {
  const coupons = await db.coupon.findMany({ orderBy: { createdAt: "desc" } });
  const rows = coupons.map((c) => ({ ...c, value: Number(c.value) }));

  return (
    <>
      <Topbar title="الخصومات والكوبونات" subtitle={`${formatNumber(coupons.length)} كوبون`} />
      <div className="p-5 lg:p-8">
        <CouponsManager coupons={rows} />
      </div>
    </>
  );
}
