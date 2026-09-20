"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { updateStoreInfoAction } from "@/server/settings/actions";
import type { StoreInfoSettings } from "@/server/settings";

function Field({
  name,
  label,
  defaultValue,
  ...rest
}: { name: string; label: string; defaultValue?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-muted">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue}
        {...rest}
        className="h-11 w-full rounded-xl border bg-transparent px-3.5 outline-none focus:ring-2 focus:ring-brand-500/40"
      />
    </label>
  );
}

export function StoreInfoForm({ info }: { info: StoreInfoSettings }) {
  const [state, formAction, isPending] = useActionState(updateStoreInfoAction, {});
  const [logoName, setLogoName] = useState<string | null>(null);

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </div>
      )}

      <div>
        <span className="mb-1.5 block text-sm font-medium text-muted">شعار المتجر</span>
        <div className="flex items-center gap-4">
          <div className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[var(--surface-sunken)]">
            {info.logoUrl ? (
              <Image src={info.logoUrl} alt="" fill sizes="64px" className="object-contain p-1.5" />
            ) : (
              <span className="text-xl font-bold text-brand-700">{info.name.slice(0, 1)}</span>
            )}
          </div>
          <div className="flex-1 space-y-2">
            <label className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed text-sm text-muted hover:border-brand-400 hover:text-brand-600">
              <input
                type="file"
                name="logo"
                accept="image/png,image/webp,image/jpeg"
                className="hidden"
                onChange={(e) => setLogoName(e.target.files?.[0]?.name ?? null)}
              />
              {logoName ?? "اختر شعاراً جديداً (PNG/WEBP/JPG، يُفضَّل خلفية شفافة)"}
            </label>
            {info.logoUrl && (
              <label className="flex items-center gap-2 text-xs text-muted">
                <input type="checkbox" name="removeLogo" className="h-3.5 w-3.5 accent-red-600" />
                إزالة الشعار والعودة لشارة الحرف الأول
              </label>
            )}
          </div>
        </div>
      </div>

      <Field name="name" label="اسم المتجر" defaultValue={info.name} />
      <Field name="tagline" label="الشعار المختصر" defaultValue={info.tagline} />
      <Field name="phone" label="رقم التواصل" defaultValue={info.phone} dir="ltr" className="num" />
      <Field name="email" label="البريد الإلكتروني" defaultValue={info.email} type="email" dir="ltr" className="num" />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "جارٍ الحفظ…" : "حفظ بيانات المتجر"}
        </Button>
      </div>
    </form>
  );
}
