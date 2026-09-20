import { Topbar } from "@/components/admin/Topbar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { db } from "@/server/db";
import { formatDate, formatNumber } from "@/lib/format";

const TYPE_LABEL: Record<string, string> = {
  PERCENTAGE: "نسبة مئوية",
  FIXED: "مبلغ ثابت",
  FREE_SHIPPING: "شحن مجاني",
};

export default async function AdminDiscountsPage() {
  const coupons = await db.coupon.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <>
      <Topbar title="الخصومات والكوبونات" subtitle={`${formatNumber(coupons.length)} كوبون`} actions={<Button size="sm">+ كوبون جديد</Button>} />
      <div className="p-5 lg:p-8">
        <div className="surface-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted">
                  <th className="px-5 py-3 text-start font-medium">الكود</th>
                  <th className="px-5 py-3 text-start font-medium">النوع</th>
                  <th className="px-5 py-3 text-start font-medium">القيمة</th>
                  <th className="px-5 py-3 text-start font-medium">الاستخدام</th>
                  <th className="px-5 py-3 text-start font-medium">الحالة</th>
                  <th className="px-5 py-3 text-start font-medium">أُنشئ</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => (
                  <tr key={c.id} className="border-t transition-colors hover:bg-ink-50 dark:hover:bg-ink-800/40">
                    <td className="num px-5 py-3 font-semibold">{c.code}</td>
                    <td className="px-5 py-3 text-muted">{TYPE_LABEL[c.type]}</td>
                    <td className="num px-5 py-3">
                      {c.type === "PERCENTAGE" ? `${c.value}%` : c.type === "FIXED" ? `${c.value} ر.س` : "—"}
                    </td>
                    <td className="num px-5 py-3 text-muted">
                      {c.usageCount}{c.usageLimit ? ` / ${c.usageLimit}` : ""}
                    </td>
                    <td className="px-5 py-3"><Badge tone={c.isActive ? "green" : "gray"}>{c.isActive ? "فعّال" : "متوقف"}</Badge></td>
                    <td className="px-5 py-3 text-xs text-muted">{formatDate(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
