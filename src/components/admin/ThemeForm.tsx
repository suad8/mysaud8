"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { updateThemeAction, type ThemeFormState } from "@/server/theme/actions";
import { FooterEditor, type LinkOptionGroup } from "@/components/admin/FooterEditor";
import { FeaturedPicker, type FeaturedCandidate } from "@/components/admin/FeaturedPicker";
import type { HomepageSectionsSettings } from "@/server/settings";
import {
  COLOR_PRESETS,
  HOMEPAGE_SECTION_LABEL,
  type HomepageSectionKey,
  type ThemeSettings,
  type TrustItem,
} from "@/lib/theme";

type ProductOption = FeaturedCandidate & { slug: string };
type LogoRow = { key: string; name: string; logoUrl: string };

let rowSeq = 0;
const nextKey = () => `logo-${++rowSeq}`;

const inputCls = "h-10 w-full rounded-lg border bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-brand-500/40";

function TextField({ name, label, defaultValue, placeholder, dir, type }: { name: string; label: string; defaultValue?: string | number; placeholder?: string; dir?: "ltr"; type?: string }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      <input name={name} type={type} defaultValue={defaultValue} placeholder={placeholder} dir={dir} className={inputCls} />
    </label>
  );
}

function Card({ title, desc, children, open }: { title: string; desc?: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details open={open} className="surface-card group p-5">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {desc && <p className="mt-0.5 text-xs text-muted">{desc}</p>}
        </div>
        <span className="text-muted transition-transform group-open:rotate-180">▾</span>
      </summary>
      <div className="mt-4 space-y-4">{children}</div>
    </details>
  );
}

function PairFields({ items, titleName, descName, titleLabel = "العنوان", descLabel = "الوصف" }: { items: TrustItem[]; titleName: string; descName: string; titleLabel?: string; descLabel?: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map((item, i) => (
        <div key={i} className="grid grid-cols-2 gap-2 rounded-lg border p-2.5">
          <TextField name={titleName} label={`${titleLabel} ${i + 1}`} defaultValue={item.title} />
          <TextField name={descName} label={descLabel} defaultValue={item.desc} />
        </div>
      ))}
    </div>
  );
}

export function ThemeForm({
  theme,
  visibility,
  products,
  linkOptions,
}: {
  theme: ThemeSettings;
  visibility: HomepageSectionsSettings;
  products: ProductOption[];
  linkOptions: LinkOptionGroup[];
}) {
  const [state, formAction, isPending] = useActionState<ThemeFormState, FormData>(updateThemeAction, {});
  const [primary, setPrimary] = useState(theme.primaryColor);
  const [accent, setAccent] = useState(theme.accentColor);
  const [order, setOrder] = useState<HomepageSectionKey[]>(theme.sectionOrder);
  const [logos, setLogos] = useState<LogoRow[]>(() => theme.paymentLogos.map((l) => ({ key: nextKey(), ...l })));

  // بعد الحفظ: تحديث روابط الشعارات المرفوعة حديثاً حتى لا تُفقد عند الحفظ التالي
  useEffect(() => {
    if (state.success && state.paymentLogos) {
      setLogos(state.paymentLogos.map((l) => ({ key: nextKey(), ...l })));
    }
  }, [state]);

  function move(index: number, delta: -1 | 1) {
    setOrder((o) => {
      const target = index + delta;
      if (target < 0 || target >= o.length) return o;
      const copy = [...o];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  }

  function sectionFields(key: HomepageSectionKey) {
    switch (key) {
      case "hero":
        return <p className="text-xs text-muted">نصوص البانر وصورته تُعدَّل من نموذج "البانر الرئيسي" أعلى الصفحة.</p>;
      case "trustBar":
        return <PairFields items={theme.trustItems} titleName="trustTitle" descName="trustDesc" titleLabel="الميزة" />;
      case "categories":
        return (
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField name="categoriesEyebrow" label="الشارة الصغيرة" defaultValue={theme.categoriesEyebrow} />
            <TextField name="categoriesTitle" label="العنوان" defaultValue={theme.categoriesTitle} />
          </div>
        );
      case "featured":
        return (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField name="featuredTitle" label="العنوان" defaultValue={theme.featuredTitle} />
              <TextField name="featuredSubtitle" label="الوصف" defaultValue={theme.featuredSubtitle} />
              <TextField name="featuredLinkText" label="نص رابط عرض الكل" defaultValue={theme.featuredLinkText} />
              <TextField name="featuredLinkHref" label="رابط عرض الكل" defaultValue={theme.featuredLinkHref} dir="ltr" />
            </div>
            <FeaturedPicker products={products} initialOrder={theme.featuredOrder} initialCount={theme.featuredCount} />
          </div>
        );
      case "bundle":
        return (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block text-xs font-medium text-muted">المنتج المعروض</span>
              <select name="bundleProductSlug" defaultValue={theme.bundleProductSlug} className={inputCls}>
                <option value="">تلقائي (أحدث منتج عليه خصم)</option>
                {products.map((p) => (
                  <option key={p.slug} value={p.slug}>{p.nameAr}</option>
                ))}
              </select>
            </label>
            <TextField name="bundleBadge" label="الشارة" defaultValue={theme.bundleBadge} />
            <TextField name="bundleCtaText" label="نص الزر" defaultValue={theme.bundleCtaText} />
          </div>
        );
      case "testimonials":
        return (
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField name="testimonialsEyebrow" label="الشارة الصغيرة" defaultValue={theme.testimonialsEyebrow} />
            <TextField name="testimonialsTitle" label="العنوان" defaultValue={theme.testimonialsTitle} />
          </div>
        );
      case "arrivals":
        return (
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField name="arrivalsTitle" label="العنوان" defaultValue={theme.arrivalsTitle} />
            <TextField name="arrivalsCount" label="عدد المنتجات" type="number" defaultValue={theme.arrivalsCount} />
          </div>
        );
      case "finalCta":
        return (
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField name="finalCtaTitle" label="العنوان" defaultValue={theme.finalCtaTitle} />
            <TextField name="finalCtaText" label="النص" defaultValue={theme.finalCtaText} />
            <TextField name="finalCtaButtonText" label="نص الزر" defaultValue={theme.finalCtaButtonText} />
            <TextField name="finalCtaButtonHref" label="رابط الزر" defaultValue={theme.finalCtaButtonHref} dir="ltr" />
          </div>
        );
    }
  }

  return (
    <form
      action={formAction}
      // إرسال يدوي: الإرسال التلقائي في React 19 يفرّغ حقول النموذج حتى عند فشل الحفظ
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
        startTransition(() => formAction(formData));
      }}
      className="space-y-5"
    >
      {/* الألوان */}
      <Card title="الألوان" desc="لون المتجر الأساسي (الأزرار والروابط) واللون المميّز (الأزرار الثانوية والشارات)." open>
        <div className="flex flex-wrap gap-2">
          {COLOR_PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => {
                setPrimary(p.primary);
                setAccent(p.accent);
              }}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${primary === p.primary && accent === p.accent ? "border-brand-600 ring-2 ring-brand-500/30" : ""}`}
            >
              <span className="h-4 w-4 rounded-full" style={{ background: p.primary }} />
              <span className="h-4 w-4 rounded-full" style={{ background: p.accent }} />
              {p.name}
            </button>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex items-center gap-3 text-sm">
            <input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} className="h-10 w-14 cursor-pointer rounded-lg border" />
            <span>
              <span className="block text-xs font-medium text-muted">اللون الأساسي</span>
              <span className="num text-xs" dir="ltr">{primary}</span>
            </span>
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} className="h-10 w-14 cursor-pointer rounded-lg border" />
            <span>
              <span className="block text-xs font-medium text-muted">اللون المميّز</span>
              <span className="num text-xs" dir="ltr">{accent}</span>
            </span>
          </label>
        </div>
        <input type="hidden" name="primaryColor" value={primary} />
        <input type="hidden" name="accentColor" value={accent} />
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full px-4 py-2 text-xs font-semibold text-white" style={{ background: primary }}>زر أساسي</span>
          <span className="rounded-full px-4 py-2 text-xs font-semibold text-white" style={{ background: accent }}>زر مميّز</span>
        </div>
      </Card>

      {/* شريط الإعلان */}
      <Card title="شريط الإعلان العلوي" desc="يظهر أعلى كل صفحات المتجر — اتركه فارغاً لإخفائه.">
        <TextField name="announcement" label="النص" defaultValue={theme.announcement} placeholder="مثال: شحن مجاني للطلبات فوق 200 ر.س" />
      </Card>

      {/* أقسام الصفحة الرئيسية */}
      <Card title="أقسام الصفحة الرئيسية" desc="أظهر أو أخفِ أي قسم، رتّبها بالأسهم، وعدّل نصوص كل قسم." open>
        <div className="space-y-3">
          {order.map((key, i) => (
            <div key={key} className="rounded-xl border p-4">
              <input type="hidden" name="sectionOrder" value={key} />
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2.5 text-sm font-semibold">
                  <input type="checkbox" name={`visible_${key}`} defaultChecked={visibility[key]} className="h-4 w-4 accent-brand-600" />
                  <span className="num text-xs text-muted">{i + 1}.</span>
                  {HOMEPAGE_SECTION_LABEL[key]}
                </label>
                <div className="flex gap-1">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="grid h-8 w-8 place-items-center rounded-lg border text-sm disabled:opacity-30" aria-label="تحريك للأعلى">↑</button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === order.length - 1} className="grid h-8 w-8 place-items-center rounded-lg border text-sm disabled:opacity-30" aria-label="تحريك للأسفل">↓</button>
                </div>
              </div>
              <div className="mt-3">{sectionFields(key)}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* صفحة المنتج */}
      <Card title="صفحة المنتج" desc="المزايا الصغيرة التي تظهر تحت زر الإضافة للسلة (اترك العنوان فارغاً لإخفاء الميزة).">
        <PairFields items={theme.productTrust} titleName="productTrustTitle" descName="productTrustDesc" titleLabel="الميزة" />
      </Card>

      {/* الفوتر */}
      <Card title="الفوتر (أسفل الصفحة)" desc="النشرة البريدية، النبذة، حسابات التواصل، شعارات الدفع، الأعمدة والروابط، والسجل التجاري.">
        <div className="space-y-3 rounded-xl border p-4">
          <label className="flex items-center gap-2.5 text-sm font-semibold">
            <input type="checkbox" name="newsletterEnabled" defaultChecked={theme.newsletterEnabled} className="h-4 w-4 accent-brand-600" />
            إظهار صندوق النشرة البريدية
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField name="newsletterTitle" label="عنوان النشرة" defaultValue={theme.newsletterTitle} />
            <TextField name="newsletterText" label="وصف النشرة" defaultValue={theme.newsletterText} />
          </div>
        </div>

        <label className="block text-sm">
          <span className="mb-1 block text-xs font-medium text-muted">نبذة عن المتجر (فارغة = استخدام الوصف المختصر من الإعدادات)</span>
          <textarea name="footerAbout" defaultValue={theme.footerAbout} rows={3} className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500/40" />
        </label>

        <div className="rounded-xl border p-4">
          <p className="text-sm font-semibold">شعارات طرق الدفع</p>
          <p className="mt-0.5 text-xs text-muted">ارفع الشعار الرسمي لكل طريقة (PNG أو JPG أو WEBP). بدون شعار يظهر الاسم كنص.</p>
          <div className="mt-3 space-y-2.5">
            {logos.map((row) => (
              <div key={row.key} className="flex flex-wrap items-center gap-2.5">
                <input type="hidden" name="paymentLogoUrl" value={row.logoUrl} />
                <div className="relative grid h-10 w-16 shrink-0 place-items-center overflow-hidden rounded-lg border bg-white">
                  {row.logoUrl ? <Image src={row.logoUrl} alt={row.name} fill sizes="64px" className="object-contain p-1" /> : <span className="text-[10px] text-muted">بلا شعار</span>}
                </div>
                <input
                  name="paymentName"
                  value={row.name}
                  onChange={(e) => setLogos((ls) => ls.map((l) => (l.key === row.key ? { ...l, name: e.target.value } : l)))}
                  placeholder="الاسم (مثال: تمارا)"
                  className={`${inputCls} w-36 flex-none`}
                />
                <input type="file" name="paymentLogoFile" accept="image/png,image/jpeg,image/webp" className="max-w-56 text-xs" />
                {row.logoUrl && (
                  <button type="button" onClick={() => setLogos((ls) => ls.map((l) => (l.key === row.key ? { ...l, logoUrl: "" } : l)))} className="text-xs text-muted hover:text-red-600">
                    إزالة الشعار
                  </button>
                )}
                <button type="button" onClick={() => setLogos((ls) => ls.filter((l) => l.key !== row.key))} className="text-xs text-red-600 hover:underline">
                  حذف
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setLogos((ls) => [...ls, { key: nextKey(), name: "", logoUrl: "" }])} className="mt-3 text-xs font-medium text-brand-700 hover:underline">
            + إضافة طريقة دفع
          </button>
        </div>

        <FooterEditor
          initialColumns={theme.footerColumns}
          initialSocial={theme.socialLinks}
          savedSocial={state.success ? state.socialLinks : undefined}
          linkOptions={linkOptions}
        />

        <div className="grid gap-3 sm:grid-cols-3">
          <TextField name="commercialRegistration" label="رقم السجل التجاري (فارغ = إخفاء)" defaultValue={theme.commercialRegistration} dir="ltr" />
          <TextField name="vatNumber" label="الرقم الضريبي للمتجر (فارغ = إخفاء)" defaultValue={theme.vatNumber} dir="ltr" />
          <TextField name="footerNote" label="ملاحظة أسفل الصفحة" defaultValue={theme.footerNote} />
        </div>
      </Card>

      {/* شريط الحفظ الثابت */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-[var(--surface-raised)]/95 backdrop-blur lg:start-64">
        <div className="flex items-center justify-between gap-3 px-5 py-3 lg:px-8">
          <p className="text-sm">
            {state.error ? (
              <span className="text-red-600">{state.error}</span>
            ) : state.success && !isPending ? (
              <span className="text-emerald-600">تم حفظ الثيم ✓</span>
            ) : (
              <span className="text-muted">التغييرات تظهر في المتجر فور الحفظ.</span>
            )}
          </p>
          <Button type="submit" disabled={isPending}>
            {isPending ? "جارٍ الحفظ…" : "حفظ الثيم"}
          </Button>
        </div>
      </div>
    </form>
  );
}
