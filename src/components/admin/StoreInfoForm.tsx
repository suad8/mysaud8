"use client";

import { useActionState } from "react";
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

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </div>
      )}
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
