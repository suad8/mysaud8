"use client";

import { useState, useTransition } from "react";
import { generateProductCopyAction, type AiCopyTone } from "@/server/ai/actions";

type Context = { name: string; category: string; optionGroups: string };

/**
 * كتابة «الوصف المختصر» و«الوصف الكامل» بالذكاء الاصطناعي (Gemini): معاينة
 * قابلة للتعديل، ثم «استخدام» يضع النص في حقول النموذج — يُحفظ فقط مع زر الحفظ.
 */
export function AiCopyGenerator({
  enabled,
  getContext,
  fill,
}: {
  enabled: boolean;
  getContext: () => Context;
  fill: (field: "shortDescAr" | "descAr", value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState("");
  const [tone, setTone] = useState<AiCopyTone>("professional");
  const [shortDesc, setShortDesc] = useState("");
  const [description, setDescription] = useState("");
  const [used, setUsed] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!enabled) {
    return (
      <p className="rounded-lg bg-[var(--surface-sunken)] px-3 py-2 text-[11px] text-muted">
        ✨ كتابة الوصف بالذكاء الاصطناعي غير مفعّلة — أضف مفتاح Gemini باسم <span dir="ltr" className="num">GEMINI_API_KEY</span> في متغيرات Railway.
      </p>
    );
  }

  function generate() {
    const ctx = getContext();
    if (!ctx.name.trim()) {
      setError("اكتب اسم المنتج أولاً");
      return;
    }
    setError(null);
    setUsed(null);
    startTransition(async () => {
      try {
        const res = await generateProductCopyAction({ ...ctx, details, tone });
        if (res.error) setError(res.error);
        else {
          setShortDesc(res.shortDesc ?? "");
          setDescription(res.description ?? "");
        }
      } catch {
        setError("تعذّر الاتصال — حاول مرة أخرى");
      }
    });
  }

  function use(which: "short" | "full" | "both") {
    if (which !== "full") fill("shortDescAr", shortDesc);
    if (which !== "short") fill("descAr", description);
    setUsed(which === "both" ? "تم وضع الوصفين في الحقول أعلاه ✓" : which === "short" ? "تم وضع الوصف المختصر ✓" : "تم وضع الوصف الكامل ✓");
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl border border-dashed border-brand-400 px-4 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50 dark:hover:bg-brand-950"
      >
        ✨ اكتب الوصف بالذكاء الاصطناعي
      </button>
    );
  }

  const hasResult = Boolean(shortDesc || description);
  return (
    <div className="space-y-3 rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">✨ كتابة الوصف من اسم المنتج (Gemini)</p>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-muted hover:underline">إغلاق</button>
      </div>
      <label className="block text-sm">
        <span className="mb-1 block text-xs font-medium text-muted">معلومات تريد ذكرها (اختياري — الخامة، الاستخدام، المميزات…)</span>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={2}
          maxLength={600}
          placeholder="مثال: ورق مقوى دبل مقاوم للحرارة، مناسب للمشروبات الساخنة، طباعة شعارك بالألوان"
          className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500/40"
        />
      </label>
      <div className="flex flex-wrap items-center gap-2 text-xs" role="radiogroup" aria-label="أسلوب الكتابة">
        <span className="text-muted">الأسلوب:</span>
        {(
          [
            ["professional", "احترافي"],
            ["friendly", "ودّي وتسويقي"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={tone === value}
            onClick={() => setTone(value)}
            className={`rounded-full border px-3 py-1 font-medium ${tone === value ? "border-brand-600 bg-brand-600 text-white" : "hover:bg-[var(--surface-sunken)]"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={generate}
        disabled={isPending}
        className="rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
      >
        {isPending ? "جارٍ الكتابة…" : hasResult ? "اكتب نسخة أخرى" : "اكتب الوصف"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}

      {hasResult && (
        <div className="space-y-3 border-t pt-3">
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-muted">الوصف المختصر المقترح (يمكنك تعديله)</span>
            <input
              aria-label="الوصف المختصر المقترح"
              value={shortDesc}
              onChange={(e) => setShortDesc(e.target.value)}
              className="h-10 w-full rounded-lg border bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-brand-500/40"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-muted">الوصف الكامل المقترح (يمكنك تعديله)</span>
            <textarea
              aria-label="الوصف الكامل المقترح"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={7}
              className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-brand-500/40"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => use("both")} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
              استخدام الوصفين
            </button>
            <button type="button" onClick={() => use("short")} className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-[var(--surface-sunken)]">
              المختصر فقط
            </button>
            <button type="button" onClick={() => use("full")} className="rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-[var(--surface-sunken)]">
              الكامل فقط
            </button>
          </div>
          {used && <p className="text-xs text-emerald-600">{used} — اضغط «حفظ» لحفظه مع المنتج.</p>}
        </div>
      )}
    </div>
  );
}
