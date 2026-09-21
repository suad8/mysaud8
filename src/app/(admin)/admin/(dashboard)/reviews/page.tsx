import { Topbar } from "@/components/admin/Topbar";
import { Badge } from "@/components/ui/Badge";
import { Rating } from "@/components/ui/Rating";
import { db } from "@/server/db";
import { formatDate, formatNumber } from "@/lib/format";
import { approveReviewAction, deleteReviewAction } from "@/server/reviews/actions";

export default async function AdminReviewsPage() {
  const reviews = await db.review.findMany({
    orderBy: [{ isApproved: "asc" }, { createdAt: "desc" }],
    include: { product: { select: { nameAr: true, slug: true } } },
  });

  const pendingCount = reviews.filter((r) => !r.isApproved).length;

  return (
    <>
      <Topbar title="التقييمات" subtitle={`${formatNumber(reviews.length)} تقييم · ${formatNumber(pendingCount)} بانتظار المراجعة`} />
      <div className="p-5 lg:p-8">
        <div className="surface-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted">
                  <th className="px-5 py-3 text-start font-medium">المنتج</th>
                  <th className="px-5 py-3 text-start font-medium">الكاتب</th>
                  <th className="px-5 py-3 text-start font-medium">التقييم</th>
                  <th className="px-5 py-3 text-start font-medium">التعليق</th>
                  <th className="px-5 py-3 text-start font-medium">التاريخ</th>
                  <th className="px-5 py-3 text-start font-medium">الحالة</th>
                  <th className="px-5 py-3 text-start font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((r) => (
                  <tr key={r.id} className="border-t transition-colors hover:bg-ink-50 dark:hover:bg-ink-800/40">
                    <td className="px-5 py-3 font-medium">{r.product.nameAr}</td>
                    <td className="px-5 py-3">{r.authorName}</td>
                    <td className="px-5 py-3"><Rating value={r.rating} /></td>
                    <td className="max-w-xs truncate px-5 py-3 text-muted">{r.comment ?? "—"}</td>
                    <td className="px-5 py-3 text-xs text-muted">{formatDate(r.createdAt)}</td>
                    <td className="px-5 py-3">
                      <Badge tone={r.isApproved ? "green" : "amber"}>{r.isApproved ? "معتمد" : "بانتظار المراجعة"}</Badge>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {!r.isApproved && (
                          <form action={approveReviewAction.bind(null, r.id)}>
                            <button type="submit" className="text-xs font-medium text-brand-700 hover:underline">اعتماد</button>
                          </form>
                        )}
                        <form action={deleteReviewAction.bind(null, r.id)}>
                          <button type="submit" className="text-xs font-medium text-red-600 hover:underline">حذف</button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
                {reviews.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-sm text-muted">لا توجد تقييمات بعد</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
