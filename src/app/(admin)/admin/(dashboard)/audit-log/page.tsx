import { redirect } from "next/navigation";
import { Topbar } from "@/components/admin/Topbar";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { db } from "@/server/db";
import { getSession } from "@/server/auth/session";
import { AdminRole } from "@prisma/client";
import { formatDateTime } from "@/lib/format";

const ACTION_LABEL: Record<string, string> = {
  "login.success": "تسجيل دخول ناجح",
  "login.failed": "محاولة دخول فاشلة",
  "login.locked": "قفل الحساب بعد محاولات فاشلة",
  logout: "تسجيل خروج",
  "password.changed": "تغيير كلمة المرور",
  "adminUser.created": "إنشاء مستخدم إداري",
  "adminUser.toggled": "تفعيل/تعطيل مستخدم إداري",
  "product.created": "إنشاء منتج",
  "product.updated": "تعديل منتج",
  "product.archived": "أرشفة منتج",
  "product.published": "نشر منتج",
  "product.deleted": "حذف منتج",
  "payment.confirmed": "تأكيد دفعة",
  "payment.rejected": "رفض دفعة",
  "settings.bank.updated": "تحديث إعدادات التحويل البنكي",
  "settings.gateway.updated": "تحديث إعدادات بوابة الدفع",
  "settings.storeInfo.updated": "تحديث بيانات المتجر",
  "settings.hero.updated": "تحديث بانر الصفحة الرئيسية",
  "settings.seoMarketing.updated": "تحديث إعدادات قوقل والتسويق",
  "coupon.created": "إنشاء كوبون",
  "coupon.toggled": "تفعيل/تعطيل كوبون",
  "coupon.deleted": "حذف كوبون",
  "shippingZone.created": "إنشاء منطقة شحن",
  "shippingZone.toggled": "تفعيل/تعطيل منطقة شحن",
  "shippingZone.deleted": "حذف منطقة شحن",
  "shippingRate.created": "إنشاء سعر شحن",
  "shippingRate.toggled": "تفعيل/تعطيل سعر شحن",
  "shippingRate.deleted": "حذف سعر شحن",
  "order.statusUpdated": "تحديث حالة طلب",
  "order.cancelled": "إلغاء طلب",
  "shipment.updated": "تحديث بيانات شحنة",
  "review.approved": "اعتماد تقييم",
  "review.deleted": "حذف تقييم",
  "theme.updated": "تحديث الثيم",
  "home.updated": "تحديث تصميم الصفحة الرئيسية",
  "settings.maintenance.updated": "تغيير وضع الصيانة",
  "demo.removed": "حذف البيانات التجريبية",
  "ai.imageGenerated": "توليد صورة بالذكاء الاصطناعي",
  "product.featuredToggled": "تمييز منتج",
  "product.hidden": "إخفاء منتج",
  "product.duplicated": "نسخ منتج",
  "category.created": "إنشاء تصنيف",
  "category.updated": "تعديل تصنيف",
  "category.deleted": "حذف تصنيف",
  "page.created": "إنشاء صفحة",
  "page.defaultsCreated": "إنشاء الصفحات الأساسية",
  "page.updated": "تعديل صفحة",
  "page.deleted": "حذف صفحة",
  "newsletter.subscriberDeleted": "حذف مشترك من النشرة",
};

const ACTION_TONE: Record<string, BadgeTone> = {
  "login.success": "green",
  "login.failed": "amber",
  "login.locked": "red",
  logout: "gray",
  "password.changed": "blue",
  "adminUser.created": "violet",
  "adminUser.toggled": "violet",
  "product.deleted": "red",
  "payment.confirmed": "green",
  "payment.rejected": "red",
  "order.cancelled": "red",
  "category.deleted": "red",
  "page.deleted": "red",
};

export default async function AdminAuditLogPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  if (session.role !== AdminRole.OWNER) redirect("/admin");

  const logs = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { actor: { select: { name: true, email: true } } },
  });

  return (
    <>
      <Topbar title="سجل النشاطات" subtitle="آخر 100 حدث أمني وإداري — لحساب المالك فقط" />
      <div className="p-5 lg:p-8">
        <div className="surface-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted">
                  <th className="px-5 py-3 text-start font-medium">الوقت</th>
                  <th className="px-5 py-3 text-start font-medium">المستخدم</th>
                  <th className="px-5 py-3 text-start font-medium">الإجراء</th>
                  <th className="px-5 py-3 text-start font-medium">الكيان</th>
                  <th className="px-5 py-3 text-start font-medium">IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-t transition-colors hover:bg-ink-50 dark:hover:bg-ink-800/40">
                    <td className="num px-5 py-3 text-xs text-muted whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                    <td className="px-5 py-3">
                      {log.actor ? (
                        <div>
                          <p className="font-medium">{log.actor.name}</p>
                          <p className="text-xs text-muted" dir="ltr">{log.actor.email}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-muted">غير معروف</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <Badge tone={ACTION_TONE[log.action] ?? "gray"}>{ACTION_LABEL[log.action] ?? log.action}</Badge>
                    </td>
                    <td className="px-5 py-3 text-xs text-muted">
                      {log.entity}
                      {log.entityId && <span className="num"> · {log.entityId.slice(0, 10)}</span>}
                    </td>
                    <td className="num px-5 py-3 text-xs text-muted" dir="ltr">{log.ip ?? "—"}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-muted">
                      لا توجد أحداث مسجّلة بعد
                    </td>
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
