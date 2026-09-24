"use server";

import { requireOwner } from "@/server/auth/session";
import { logAudit } from "@/server/audit/log";
import { removeDemoData } from "@/server/demo/cleanup";

export type RemoveDemoState = { error?: string; done?: string };

export async function removeDemoDataAction(_prev: RemoveDemoState, formData: FormData): Promise<RemoveDemoState> {
  const session = await requireOwner();
  if (formData.get("confirm") !== "on") return { error: "أكّد أولاً أنك تريد حذف البيانات التجريبية" };

  const result = await removeDemoData();
  await logAudit({ actorId: session.sub, action: "demo.removed", entity: "Setting", diff: result });

  // بلا revalidatePath عمداً: إعادة رسم صفحة الإعدادات تُخفي هذا القسم (لم تعد هناك بيانات
  // تجريبية) فتختفي رسالة النتيجة. صفحات المتجر ديناميكية فتظهر التغييرات فوراً على أي حال.
  const parts = [
    result.products && `${result.products} منتج`,
    result.productsArchived && `${result.productsArchived} منتج مؤرشف (مرتبط بطلبات حقيقية)`,
    result.orders && `${result.orders} طلب`,
    result.customers && `${result.customers} عميل`,
    result.categories && `${result.categories} تصنيف`,
    result.coupons && `${result.coupons} كوبون`,
    result.ibanCleared && "الآيبان الوهمي",
  ].filter(Boolean);
  return { done: parts.length ? `تم حذف: ${parts.join("، ")} — مع تقييماتها.` : "لا توجد بيانات تجريبية." };
}
