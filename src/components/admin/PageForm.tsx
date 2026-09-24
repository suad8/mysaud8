"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { PageFormState } from "@/server/pages/actions";

type Action = (state: PageFormState, formData: FormData) => Promise<PageFormState>;

export function PageForm({
  action,
  initial,
}: {
  action: Action;
  initial: { title: string; slug: string; content: string; isPublished: boolean };
}) {
  const [state, formAction, isPending] = useActionState(action, {});
  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug);
  const [content, setContent] = useState(initial.content);
  const [isPublished, setIsPublished] = useState(initial.isPublished);

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200 dark:bg-red-950 dark:text-red-300">{state.error}</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-muted">العنوان</span>
          <input name="title" value={title} onChange={(e) => setTitle(e.target.value)} required className="h-11 w-full rounded-xl border bg-transparent px-3.5 outline-none focus:ring-2 focus:ring-brand-500/40" />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-muted">الرابط</span>
          <div className="flex items-center gap-2">
            <span className="num text-xs text-muted" dir="ltr">/pages/</span>
            <input name="slug" value={slug} onChange={(e) => setSlug(e.target.value)} dir="ltr" className="num h-11 w-full rounded-xl border bg-transparent px-3.5 outline-none focus:ring-2 focus:ring-brand-500/40" />
          </div>
        </label>
      </div>

      <label className="block text-sm">
        <span className="mb-1.5 block font-medium text-muted">المحتوى</span>
        <textarea
          name="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={18}
          placeholder="اكتب محتوى الصفحة هنا. كل سطر فارغ يفصل فقرة عن الأخرى."
          className="w-full rounded-xl border bg-transparent px-3.5 py-3 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-brand-500/40"
        />
      </label>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2.5 text-sm font-medium">
          <input type="checkbox" name="isPublished" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="h-4 w-4 accent-brand-600" />
          منشورة (تظهر للزوار)
        </label>
        <div className="flex items-center gap-3">
          {state.success && !isPending && <span className="text-sm text-emerald-600">تم الحفظ ✓</span>}
          <Button type="submit" size="sm" disabled={isPending}>{isPending ? "جارٍ الحفظ…" : "حفظ الصفحة"}</Button>
        </div>
      </div>
    </form>
  );
}
