import { redirect } from "next/navigation";
import { Topbar } from "@/components/admin/Topbar";
import { Button } from "@/components/ui/Button";
import { HeroBannerForm } from "@/components/admin/HeroBannerForm";
import { StoreInfoForm } from "@/components/admin/StoreInfoForm";
import { ChangePasswordForm } from "@/components/admin/ChangePasswordForm";
import { AdminUsersManager } from "@/components/admin/AdminUsersManager";
import { db } from "@/server/db";
import { getSession } from "@/server/auth/session";
import { AdminRole } from "@prisma/client";
import { getBankTransferSettings, getHeroContent, getMoyasarSettings, getStoreInfoSettings, maskSecret } from "@/server/settings";
import { updateBankSettingsAction, updateGatewaySettingsAction } from "@/server/settings/actions";

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="surface-card p-5">
      <h2 className="text-sm font-semibold">{title}</h2>
      {desc && <p className="mt-1 text-xs text-muted">{desc}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Field({
  name,
  label,
  defaultValue,
  unit,
  ...rest
}: { name: string; label: string; unit?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-muted">{label}</span>
      <div className="relative">
        <input
          name={name}
          defaultValue={defaultValue}
          {...rest}
          className="h-11 w-full rounded-xl border bg-transparent px-3.5 outline-none focus:ring-2 focus:ring-brand-500/40"
        />
        {unit && <span className="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-xs text-muted">{unit}</span>}
      </div>
    </label>
  );
}

function ToggleRow({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center justify-between rounded-xl border px-4 py-3">
      <span className="text-sm font-medium">{label}</span>
      <span className="relative inline-flex h-6 w-11 shrink-0 items-center">
        <input type="checkbox" name={name} defaultChecked={defaultChecked} className="peer sr-only" />
        <span className="absolute inset-0 rounded-full bg-ink-200 transition-colors peer-checked:bg-brand-600 dark:bg-ink-700" />
        <span className="absolute start-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:-translate-x-5" />
      </span>
    </label>
  );
}

export default async function AdminSettingsPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const [bank, gateway, storeInfo, hero, users] = await Promise.all([
    getBankTransferSettings(),
    getMoyasarSettings(),
    getStoreInfoSettings(),
    getHeroContent(),
    db.adminUser.findMany({
      orderBy: { lastLoginAt: "desc" },
      select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true },
    }),
  ]);

  return (
    <>
      <Topbar title="الإعدادات" subtitle="بيانات المتجر والتشغيل" />
      <div className="grid gap-6 p-5 lg:grid-cols-2 lg:p-8">
        <Section title="بيانات المتجر">
          <StoreInfoForm info={storeInfo} />
        </Section>

        <Section title="بانر الصفحة الرئيسية" desc="يظهر مباشرة أعلى المتجر — الصورة والنصوص والأزرار.">
          <HeroBannerForm hero={hero} />
        </Section>

        <Section title="الضريبة والعملة">
          <Field name="taxRate" label="نسبة ضريبة القيمة المضافة" defaultValue="15" unit="%" />
          <Field name="currency" label="العملة" defaultValue="ريال سعودي (SAR)" />
          <label className="flex items-center gap-2.5 text-sm">
            <input type="checkbox" defaultChecked className="h-4 w-4 accent-brand-600" />
            الأسعار المعروضة شاملة الضريبة
          </label>
          <p className="text-[11px] text-muted">* هذا القسم عرض تصميمي حالياً — الحفظ الفعلي قادم في مرحلة لاحقة.</p>
        </Section>

        <Section title="تغيير كلمة المرور" desc="لحسابك الحالي فقط.">
          <ChangePasswordForm />
        </Section>

        {/* ── التحويل البنكي: قسم فعّال يحفظ في قاعدة البيانات ويظهر مباشرة في صفحة الدفع ── */}
        <form action={updateBankSettingsAction} className="lg:col-span-2">
          <Section title="الدفع بالتحويل البنكي" desc="البيانات هنا تظهر للعميل مباشرة عند اختياره «تحويل بنكي» في صفحة الدفع.">
            <ToggleRow name="enabled" label="تفعيل الدفع بالتحويل البنكي" defaultChecked={bank.enabled} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field name="bankName" label="اسم البنك" defaultValue={bank.bankName} placeholder="مثال: البنك الأهلي السعودي" />
              <Field name="accountName" label="اسم صاحب الحساب" defaultValue={bank.accountName} placeholder="مثال: شركة فنجان للتجارة" />
              <Field name="iban" label="رقم الآيبان (IBAN)" defaultValue={bank.iban} placeholder="SA00 0000 0000 0000 0000 0000" className="num" />
              <Field name="accountNumber" label="رقم الحساب" defaultValue={bank.accountNumber} className="num" />
            </div>
            <div className="flex justify-end">
              <Button type="submit" size="sm">حفظ بيانات الحساب</Button>
            </div>
          </Section>
        </form>

        {/* ── بوابة الدفع الإلكتروني: قسم فعّال، يخزّن المفاتيح لربط حقيقي لاحقاً ── */}
        <form action={updateGatewaySettingsAction} className="lg:col-span-2">
          <Section
            title="بوابة الدفع الإلكتروني (Moyasar)"
            desc="لتفعيل الدفع الفوري بمدى وApple Pay والبطاقات. أدخل مفاتيح حسابك في Moyasar — المفتاح السري لا يُعرض بعد الحفظ لأسباب أمنية."
          >
            <ToggleRow name="enabled" label="تفعيل بوابة Moyasar" defaultChecked={gateway.enabled} />
            <Field name="publishableKey" label="المفتاح العلني (Publishable Key)" defaultValue={gateway.publishableKey} className="num" dir="ltr" />
            <Field
              name="secretKey"
              label="المفتاح السري (Secret Key)"
              type="password"
              placeholder={gateway.secretKey ? maskSecret(gateway.secretKey) : "لم يُحفظ بعد"}
              dir="ltr"
            />
            <p className="text-[11px] text-muted">
              اترك حقل المفتاح السري فارغاً عند الحفظ للإبقاء على القيمة المحفوظة حالياً.
            </p>
            <div className="flex justify-end">
              <Button type="submit" size="sm">حفظ إعدادات البوابة</Button>
            </div>
          </Section>
        </form>

        <Section title="المستخدمون والصلاحيات" desc="حسابات الدخول إلى لوحة التحكم.">
          <AdminUsersManager users={users} currentUserId={session.sub} canManage={session.role === AdminRole.OWNER} />
        </Section>
      </div>
    </>
  );
}
