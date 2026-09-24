import Image from "next/image";
import Link from "next/link";
import { Topbar } from "@/components/admin/Topbar";
import { StatCard } from "@/components/admin/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Price } from "@/components/ui/Price";
import { Button } from "@/components/ui/Button";
import { WhatsAppButton } from "@/components/admin/WhatsAppButton";
import { db } from "@/server/db";
import { requireAdminPage } from "@/server/auth/session";
import { getStoreInfoSettings } from "@/server/settings";
import { markCartRemindedAction } from "@/server/cart/admin-actions";
import { cartRecoveryUrl } from "@/server/cart/recover";
import { whatsappLink } from "@/lib/phone";
import { formatNumber, formatRelative } from "@/lib/format";

type Props = { searchParams: Promise<{ all?: string; coupon?: string }> };

/** السلة تُعدّ متروكة بعد ساعة بلا نشاط، ونعرض آخر 30 يوماً فقط. */
const IDLE_MS = 60 * 60 * 1000;
const WINDOW_DAYS = 30;

export default async function AbandonedCartsPage({ searchParams }: Props) {
  await requireAdminPage();
  const { all, coupon = "" } = await searchParams;
  const showAll = all === "1";
  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000);
  const idleBefore = Date.now() - IDLE_MS;

  const [rows, coupons, store, recovered] = await Promise.all([
    db.cart.findMany({
      where: { status: "ACTIVE", items: { some: {} }, updatedAt: { gte: since } },
      orderBy: { updatedAt: "desc" },
      take: 300,
      include: {
        items: {
          include: {
            product: { select: { nameAr: true, status: true, deletedAt: true, images: { select: { url: true }, orderBy: { position: "asc" }, take: 1 } } },
            variant: { select: { nameAr: true, price: true, isActive: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    db.coupon.findMany({ where: { isActive: true, OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] }, select: { code: true }, orderBy: { createdAt: "desc" } }),
    getStoreInfoSettings(),
    db.cart.count({ where: { status: "CONVERTED", remindedAt: { not: null }, updatedAt: { gte: since } } }),
  ]);

  const chosenCoupon = coupons.some((c) => c.code === coupon) ? coupon : "";

  const carts = rows
    .map((cart) => {
      const items = cart.items.filter((i) => i.product.status === "ACTIVE" && !i.product.deletedAt && i.variant.isActive);
      const lastActivity = Math.max(cart.updatedAt.getTime(), ...cart.items.map((i) => i.createdAt.getTime()));
      const total = items.reduce((s, i) => s + Number(i.variant.price) * i.quantity, 0);
      return { ...cart, items, lastActivity, total };
    })
    .filter((c) => c.items.length > 0 && c.lastActivity < idleBefore);

  const withPhone = carts.filter((c) => c.phone);
  const shown = showAll ? carts : withPhone;
  const names = new Map(
    (await db.customer.findMany({ where: { phone: { in: withPhone.map((c) => c.phone!) } }, select: { phone: true, name: true } })).map((c) => [c.phone, c.name]),
  );

  function reminder(cart: (typeof carts)[number]): string {
    const name = names.get(cart.phone);
    const lines = cart.items.slice(0, 5).map((i) => `• ${i.product.nameAr}${i.variant.nameAr !== "الافتراضي" ? ` (${i.variant.nameAr})` : ""} × ${i.quantity}`);
    return [
      `مرحباً${name ? ` ${name}` : ""} 👋`,
      `لاحظنا أن سلتك في ${store.name} ما زالت بانتظارك:`,
      ...lines,
      cart.items.length > 5 ? `…و${cart.items.length - 5} منتجات أخرى` : "",
      chosenCoupon ? `🎁 استخدم كود الخصم ${chosenCoupon} عند إتمام الطلب` : "",
      `أكمل طلبك من هنا: ${cartRecoveryUrl(cart.id)}`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  const potential = withPhone.reduce((s, c) => s + c.total, 0);

  return (
    <>
      <Topbar title="السلات المتروكة" subtitle="عملاء أضافوا منتجات وبدؤوا الدفع ولم يكملوا — ذكّرهم بضغطة" />
      <div className="space-y-6 p-5 lg:p-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="سلات متروكة بها رقم جوال" value={formatNumber(withPhone.length)} icon="M4 6h16l-1.4 10.3a2 2 0 0 1-2 1.7H7.4a2 2 0 0 1-2-1.7ZM9 10V6a3 3 0 0 1 6 0v4" />
          <StatCard label="قيمتها المحتملة" value={`${formatNumber(Math.round(potential))} ر.س`} icon="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          <StatCard label="استُعيدت بعد التذكير (30 يوماً)" value={formatNumber(recovered)} icon="M4 12l5 5L20 6" />
        </div>

        <div className="surface-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
            <div className="flex gap-2 text-sm">
              <Link href={`/admin/abandoned-carts${chosenCoupon ? `?coupon=${encodeURIComponent(chosenCoupon)}` : ""}`} className={`rounded-lg border px-3 py-1.5 font-medium ${!showAll ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300" : "text-muted"}`}>
                بها رقم جوال ({formatNumber(withPhone.length)})
              </Link>
              <Link href={`/admin/abandoned-carts?all=1${chosenCoupon ? `&coupon=${encodeURIComponent(chosenCoupon)}` : ""}`} className={`rounded-lg border px-3 py-1.5 font-medium ${showAll ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300" : "text-muted"}`}>
                الكل ({formatNumber(carts.length)})
              </Link>
            </div>
            <form method="GET" className="flex items-center gap-2 text-sm">
              {showAll && <input type="hidden" name="all" value="1" />}
              <label htmlFor="coupon" className="text-xs text-muted">أرفق كود خصم بالرسالة:</label>
              <select id="coupon" name="coupon" defaultValue={chosenCoupon} className="h-9 rounded-lg border bg-transparent px-2 text-sm">
                <option value="">بدون كود</option>
                {coupons.map((c) => (
                  <option key={c.code} value={c.code}>{c.code}</option>
                ))}
              </select>
              <Button type="submit" size="sm" variant="secondary">تطبيق</Button>
            </form>
          </div>

          {shown.length === 0 ? (
            <div className="px-4 py-14 text-center">
              <p className="text-sm font-semibold">لا توجد سلات متروكة {showAll ? "" : "بها رقم جوال"} حالياً</p>
              <p className="mt-1 text-xs text-muted">تظهر هنا السلة بعد ساعة من آخر نشاط إن لم يكمل العميل طلبه. رقم الجوال يُحفظ عندما يضغط «متابعة للدفع».</p>
            </div>
          ) : (
            <ul className="divide-y">
              {shown.map((cart) => {
                const link = cart.phone ? whatsappLink(cart.phone, reminder(cart)) : null;
                const name = cart.phone ? names.get(cart.phone) : null;
                return (
                  <li key={cart.id} className="flex flex-wrap items-center gap-4 p-4" data-cart-id={cart.id}>
                    <div className="flex -space-x-2 rtl:space-x-reverse">
                      {cart.items.slice(0, 3).map((i) => (
                        <span key={i.id} className="relative h-11 w-11 overflow-hidden rounded-lg bg-[var(--surface-sunken)] ring-2 ring-[var(--surface-raised)]">
                          <Image src={i.product.images[0]?.url ?? "/products/placeholder.svg"} alt="" fill sizes="44px" className="object-cover" />
                        </span>
                      ))}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                        {name ?? (cart.phone ? "عميل" : "زائر بدون رقم")}
                        {cart.phone && <span className="num text-xs font-normal text-muted" dir="ltr">{cart.phone}</span>}
                        {cart.remindedAt && <Badge tone="green">ذُكِّر {formatRelative(cart.remindedAt)}</Badge>}
                      </p>
                      <p className="truncate text-xs text-muted">
                        {cart.items.map((i) => `${i.product.nameAr} × ${i.quantity}`).join("، ")}
                      </p>
                      <p className="text-[11px] text-muted">آخر نشاط {formatRelative(new Date(cart.lastActivity))}</p>
                    </div>
                    <Price value={cart.total} size="sm" />
                    {link && <WhatsAppButton href={link} label="تذكير واتساب" onSent={markCartRemindedAction.bind(null, cart.id)} />}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <p className="text-xs text-muted">
          الرسالة تحتوي رابطاً خاصاً يفتح سلة العميل نفسها على أي جهاز. لا تُرسل الرسائل تلقائياً — يفتح واتساب برسالة جاهزة وتضغط إرسال بنفسك.
        </p>
      </div>
    </>
  );
}
