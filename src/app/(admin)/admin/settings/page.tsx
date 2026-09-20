import { Topbar } from "@/components/admin/Topbar";
import { Button } from "@/components/ui/Button";

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="surface-card p-5">
      <h2 className="text-sm font-semibold">{title}</h2>
      {desc && <p className="mt-1 text-xs text-muted">{desc}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, defaultValue, unit }: { label: string; defaultValue?: string; unit?: string }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-muted">{label}</span>
      <div className="relative">
        <input defaultValue={defaultValue} className="h-11 w-full rounded-xl border bg-transparent px-3.5 outline-none focus:ring-2 focus:ring-brand-500/40" />
        {unit && <span className="pointer-events-none absolute end-3.5 top-1/2 -translate-y-1/2 text-xs text-muted">{unit}</span>}
      </div>
    </label>
  );
}

export default function AdminSettingsPage() {
  return (
    <>
      <Topbar title="الإعدادات" subtitle="بيانات المتجر والتشغيل" actions={<Button size="sm">حفظ التغييرات</Button>} />
      <div className="grid gap-6 p-5 lg:grid-cols-2 lg:p-8">
        <Section title="بيانات المتجر">
          <Field label="اسم المتجر" defaultValue="نسيم" />
          <Field label="الشعار المختصر" defaultValue="عناية وعطور وقهوة" />
          <Field label="رقم التواصل" defaultValue="+966500000000" />
          <Field label="البريد الإلكتروني" defaultValue="support@example.com" />
        </Section>

        <Section title="الضريبة والعملة">
          <Field label="نسبة ضريبة القيمة المضافة" defaultValue="15" unit="%" />
          <Field label="العملة" defaultValue="ريال سعودي (SAR)" />
          <label className="flex items-center gap-2.5 text-sm">
            <input type="checkbox" defaultChecked className="h-4 w-4 accent-brand-600" />
            الأسعار المعروضة شاملة الضريبة
          </label>
        </Section>

        <Section title="الشحن" desc="مناطق الشحن التفصيلية تُدار من صفحة منفصلة">
          <Field label="الحد الأدنى للشحن المجاني" defaultValue="300" unit="ر.س" />
          <Field label="سعر الشحن العادي" defaultValue="25" unit="ر.س" />
          <Field label="سعر الشحن السريع" defaultValue="45" unit="ر.س" />
        </Section>

        <Section title="بوابات الدفع" desc="مفاتيح الربط تُدخل من متغيّرات البيئة لأسباب أمنية">
          {[
            ["Moyasar (مدى، بطاقات، Apple Pay)", true],
            ["تابي", false],
            ["تمارا", false],
            ["الدفع عند الاستلام", true],
          ].map(([label, enabled]) => (
            <div key={label as string} className="flex items-center justify-between rounded-xl border px-4 py-3">
              <span className="text-sm font-medium">{label}</span>
              <span
                className={`h-6 w-11 rounded-full p-0.5 transition-colors ${enabled ? "bg-brand-600" : "bg-ink-200 dark:bg-ink-700"}`}
              >
                <span className={`block h-5 w-5 rounded-full bg-white transition-transform ${enabled ? "translate-x-0" : "translate-x-5"}`} />
              </span>
            </div>
          ))}
        </Section>

        <Section title="المستخدمون والصلاحيات">
          <div className="space-y-2.5">
            {[
              ["مدير المتجر", "مالك"],
              ["فريق الدعم", "موظف"],
            ].map(([name, role]) => (
              <div key={name} className="flex items-center justify-between rounded-xl border px-4 py-3 text-sm">
                <span className="font-medium">{name}</span>
                <span className="text-xs text-muted">{role}</span>
              </div>
            ))}
          </div>
          <button className="text-xs font-medium text-brand-700 hover:underline">+ دعوة مستخدم جديد</button>
        </Section>
      </div>
    </>
  );
}
