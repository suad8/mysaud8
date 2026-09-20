import Image from "next/image";
import { Topbar } from "@/components/admin/Topbar";
import { Badge } from "@/components/ui/Badge";
import { db } from "@/server/db";
import { formatNumber } from "@/lib/format";

export default async function AdminInventoryPage() {
  const items = await db.inventoryItem.findMany({
    include: { variant: { include: { product: { include: { images: { take: 1, orderBy: { position: "asc" } } } } } } },
    orderBy: { onHand: "asc" },
  });

  return (
    <>
      <Topbar title="المخزون" subtitle={`${formatNumber(items.length)} صنف`} />
      <div className="p-5 lg:p-8">
        <div className="surface-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted">
                  <th className="px-5 py-3 text-start font-medium">المنتج</th>
                  <th className="px-5 py-3 text-start font-medium">SKU</th>
                  <th className="px-5 py-3 text-start font-medium">الكمية الفعلية</th>
                  <th className="px-5 py-3 text-start font-medium">محجوز</th>
                  <th className="px-5 py-3 text-start font-medium">المتاح</th>
                  <th className="px-5 py-3 text-start font-medium">الحالة</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const available = item.onHand - item.reserved;
                  const tone = available === 0 ? "gray" : available <= item.lowStockAt ? "amber" : "green";
                  const label = available === 0 ? "نفد" : available <= item.lowStockAt ? "منخفض" : "متوفر";
                  return (
                    <tr key={item.id} className="border-t transition-colors hover:bg-ink-50 dark:hover:bg-ink-800/40">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[var(--surface-sunken)]">
                            <Image src={item.variant.product.images[0]?.url ?? "/products/placeholder.svg"} alt="" fill sizes="40px" className="object-cover" />
                          </div>
                          <div>
                            <p className="font-medium">{item.variant.product.nameAr}</p>
                            <p className="text-xs text-muted">{item.variant.nameAr}</p>
                          </div>
                        </div>
                      </td>
                      <td className="num px-5 py-3 text-muted">{item.variant.sku}</td>
                      <td className="px-5 py-3">
                        <input defaultValue={item.onHand} className="num h-9 w-20 rounded-lg border bg-transparent px-2.5 outline-none focus:ring-2 focus:ring-brand-500/40" />
                      </td>
                      <td className="num px-5 py-3 text-muted">{item.reserved}</td>
                      <td className="num px-5 py-3 font-semibold">{available}</td>
                      <td className="px-5 py-3"><Badge tone={tone}>{label}</Badge></td>
                      <td className="px-5 py-3 text-end">
                        <button className="text-xs font-medium text-brand-700 hover:underline">حفظ</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
