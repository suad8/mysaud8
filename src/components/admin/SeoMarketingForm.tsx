"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { updateSeoMarketingAction } from "@/server/settings/actions";
import type { SeoMarketingSettings } from "@/server/settings";

export function SeoMarketingForm({ seo, siteUrl }: { seo: SeoMarketingSettings; siteUrl: string }) {
  const [state, formAction, isPending] = useActionState(updateSeoMarketingAction, {});

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </div>
      )}

      <label className="block text-sm">
        <span className="mb-1.5 block font-medium text-muted">معرّف Google Analytics 4</span>
        <input
          name="googleAnalyticsId"
          defaultValue={seo.googleAnalyticsId}
          placeholder="G-ABC1234567"
          dir="ltr"
          className="num h-11 w-full rounded-xl border bg-transparent px-3.5 outline-none focus:ring-2 focus:ring-brand-500/40"
        />
        <p className="mt-1 text-[11px] text-muted">
          من Google Analytics → المسؤول → مصادر البيانات → معلومات الدفق. يبدأ التتبع تلقائياً بمجرد الحفظ.
        </p>
      </label>

      <label className="block text-sm">
        <span className="mb-1.5 block font-medium text-muted">التحقق من ملكية Google Search Console</span>
        <input
          name="googleSearchConsoleVerification"
          defaultValue={seo.googleSearchConsoleVerification}
          placeholder="محتوى وسم HTML tag فقط (بدون &lt;meta&gt;)"
          dir="ltr"
          className="num h-11 w-full rounded-xl border bg-transparent px-3.5 outline-none focus:ring-2 focus:ring-brand-500/40"
        />
        <p className="mt-1 text-[11px] text-muted">
          من Search Console عند إضافة موقعك: اختر طريقة "وسم HTML" وانسخ قيمة content فقط (ليس الوسم كاملاً) والصقها هنا.
        </p>
      </label>

      <label className="block text-sm">
        <span className="mb-1.5 block font-medium text-muted">معرّف Google Tag Manager (اختياري)</span>
        <input
          name="googleTagManagerId"
          defaultValue={seo.googleTagManagerId}
          placeholder="GTM-ABCD123"
          dir="ltr"
          className="num h-11 w-full rounded-xl border bg-transparent px-3.5 outline-none focus:ring-2 focus:ring-brand-500/40"
        />
      </label>

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "جارٍ الحفظ…" : "حفظ إعدادات قوقل"}
        </Button>
      </div>

      <div className="space-y-1.5 border-t pt-4 text-xs text-muted">
        <p className="font-semibold text-[var(--text-strong)]">روابط جاهزة لتسجيلها في أدوات قوقل:</p>
        <p>
          خريطة الموقع: <a href={`${siteUrl}/sitemap.xml`} target="_blank" rel="noreferrer" dir="ltr" className="num text-brand-700 hover:underline">{siteUrl}/sitemap.xml</a>
        </p>
        <p>
          تغذية Google Merchant Center: <a href={`${siteUrl}/feed/google-merchant.xml`} target="_blank" rel="noreferrer" dir="ltr" className="num text-brand-700 hover:underline">{siteUrl}/feed/google-merchant.xml</a>
        </p>
      </div>
    </form>
  );
}
