"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { updateHeroContentAction } from "@/server/settings/actions";
import type { HeroContentSettings } from "@/server/settings";

export function HeroBannerForm({ hero }: { hero: HeroContentSettings }) {
  const [state, formAction, isPending] = useActionState(updateHeroContentAction, {});
  const [imageName, setImageName] = useState<string | null>(null);

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </div>
      )}

      <div>
        <span className="mb-1.5 block text-sm font-medium text-muted">صورة البانر</span>
        <div className="flex items-center gap-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[var(--surface-sunken)]">
            {hero.imageUrl && <Image src={hero.imageUrl} alt="" fill sizes="80px" className="object-cover" />}
          </div>
          <div className="flex-1 space-y-2">
            <label className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed text-sm text-muted hover:border-brand-400 hover:text-brand-600">
              <input
                type="file"
                name="image"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => setImageName(e.target.files?.[0]?.name ?? null)}
              />
              {imageName ?? "اختر صورة جديدة (JPG/PNG/WEBP، حتى 5 ميغابايت)"}
            </label>
            {hero.imageUrl && (
              <label className="flex items-center gap-2 text-xs text-muted">
                <input type="checkbox" name="removeImage" className="h-3.5 w-3.5 accent-red-600" />
                إزالة الصورة الحالية والعودة للاختيار التلقائي من المنتجات
              </label>
            )}
          </div>
        </div>
      </div>

      <label className="block text-sm">
        <span className="mb-1.5 block font-medium text-muted">الشارة العلوية</span>
        <input name="eyebrow" defaultValue={hero.eyebrow} className="h-11 w-full rounded-xl border bg-transparent px-3.5 outline-none focus:ring-2 focus:ring-brand-500/40" />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-muted">العنوان (السطر الأول)</span>
          <input name="headline" defaultValue={hero.headline} className="h-11 w-full rounded-xl border bg-transparent px-3.5 outline-none focus:ring-2 focus:ring-brand-500/40" />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-muted">العنوان (السطر المميَّز)</span>
          <input name="headlineHighlight" defaultValue={hero.headlineHighlight} className="h-11 w-full rounded-xl border bg-transparent px-3.5 outline-none focus:ring-2 focus:ring-brand-500/40" />
        </label>
      </div>

      <label className="block text-sm">
        <span className="mb-1.5 block font-medium text-muted">الوصف</span>
        <textarea name="subtitle" defaultValue={hero.subtitle} rows={3} className="w-full rounded-xl border bg-transparent px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-brand-500/40" />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-muted">نص الزر الأساسي</span>
          <input name="ctaText" defaultValue={hero.ctaText} className="h-11 w-full rounded-xl border bg-transparent px-3.5 outline-none focus:ring-2 focus:ring-brand-500/40" />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-muted">رابط الزر الأساسي</span>
          <input name="ctaHref" defaultValue={hero.ctaHref} dir="ltr" className="num h-11 w-full rounded-xl border bg-transparent px-3.5 outline-none focus:ring-2 focus:ring-brand-500/40" />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-muted">نص الزر الثانوي</span>
          <input name="secondaryCtaText" defaultValue={hero.secondaryCtaText} className="h-11 w-full rounded-xl border bg-transparent px-3.5 outline-none focus:ring-2 focus:ring-brand-500/40" />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-muted">رابط الزر الثانوي</span>
          <input name="secondaryCtaHref" defaultValue={hero.secondaryCtaHref} dir="ltr" className="num h-11 w-full rounded-xl border bg-transparent px-3.5 outline-none focus:ring-2 focus:ring-brand-500/40" />
        </label>
      </div>

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "جارٍ الحفظ…" : "حفظ البانر"}
        </Button>
      </div>
    </form>
  );
}
