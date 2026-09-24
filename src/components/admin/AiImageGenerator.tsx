"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { generateProductImageAction, type AiImageStyle } from "@/server/ai/actions";

const STYLES: { value: AiImageStyle; label: string; hint: string }[] = [
  { value: "studio", label: "صورة منتج احترافية", hint: "خلفية استوديو نظيفة — الأنسب للمتجر" },
  { value: "lifestyle", label: "موك أب في مكان الاستخدام", hint: "المنتج في مقهى أو مكتب أو معرض" },
  { value: "logo", label: "موك أب بشعارك أو تصميمك", hint: "ارفع شعاراً ويُطبع على المنتج" },
];

/**
 * توليد صورة المنتج بالذكاء الاصطناعي (Gemini) من اسم المنتج: معاينة، ثم
 * «استخدام هذه الصورة» يضعها في حقل مخفي فتُحفظ كصورة رئيسية مع المنتج.
 * ليس نموذجاً مستقلاً (لا نماذج متداخلة) — يستدعي الإجراء مباشرة.
 */
export function AiImageGenerator({ enabled, getProductName }: { enabled: boolean; getProductName: () => string }) {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<AiImageStyle>("studio");
  const [details, setDetails] = useState("");
  const [brandColors, setBrandColors] = useState(false);
  const [reference, setReference] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!enabled) {
    return (
      <p className="mt-3 rounded-lg bg-[var(--surface-sunken)] px-3 py-2 text-[11px] text-muted">
        ✨ توليد الصور بالذكاء الاصطناعي غير مفعّل — أضف مفتاح Gemini باسم <span dir="ltr" className="num">GEMINI_API_KEY</span> في متغيرات Railway.
      </p>
    );
  }

  function generate() {
    const name = getProductName().trim();
    if (!name) {
      setError("اكتب اسم المنتج أولاً في «المعلومات الأساسية»");
      return;
    }
    const fd = new FormData();
    fd.set("name", name);
    fd.set("details", details);
    fd.set("style", style);
    if (brandColors) fd.set("brandColors", "on");
    if (reference) fd.set("reference", reference);
    setError(null);
    startTransition(async () => {
      const res = await generateProductImageAction(fd);
      if (res.error) setError(res.error);
      else if (res.imageUrl) setPreview(res.imageUrl);
    });
  }

  return (
    <div className="mt-4">
      <input type="hidden" name="aiImageUrl" value={chosen ?? ""} />

      {chosen && (
        <div className="mb-3 flex items-center gap-3 rounded-xl bg-emerald-50 p-2.5 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg">
            <Image src={chosen} alt="" fill sizes="56px" className="object-cover" />
          </span>
          <span className="flex-1">ستُحفظ هذه الصورة كصورة رئيسية عند الضغط على زر الحفظ.</span>
          <button type="button" onClick={() => setChosen(null)} className="text-xs text-red-600 hover:underline">إلغاء</button>
        </div>
      )}

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-dashed border-brand-400 px-4 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50 dark:hover:bg-brand-950"
        >
          ✨ توليد صورة بالذكاء الاصطناعي
        </button>
      ) : (
        <div className="space-y-4 rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">✨ توليد صورة من اسم المنتج (Gemini)</p>
            <button type="button" onClick={() => setOpen(false)} className="text-xs text-muted hover:underline">إغلاق</button>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            {STYLES.map((s) => (
              <label
                key={s.value}
                className={`cursor-pointer rounded-lg border p-3 text-sm ${style === s.value ? "border-brand-600 ring-2 ring-brand-500/30" : ""}`}
              >
                <input type="radio" name="aiStyle" value={s.value} checked={style === s.value} onChange={() => setStyle(s.value)} className="sr-only" />
                <span className="block font-semibold">{s.label}</span>
                <span className="mt-0.5 block text-[11px] text-muted">{s.hint}</span>
              </label>
            ))}
          </div>

          {style === "logo" && (
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium text-muted">الشعار أو التصميم (PNG أو JPG أو WEBP)</span>
              <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setReference(e.target.files?.[0] ?? null)} className="text-xs" />
            </label>
          )}

          <label className="block text-sm">
            <span className="mb-1 block text-xs font-medium text-muted">وصف إضافي (اختياري)</span>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="مثال: كوب أبيض بغطاء أسود، أو رول أب بخلفية بنفسجية"
              className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500/40"
            />
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={brandColors} onChange={(e) => setBrandColors(e.target.checked)} className="h-4 w-4 accent-brand-600" />
            استخدم ألوان الهوية (البنفسجي والذهبي)
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={generate}
              disabled={isPending}
              className="rounded-full bg-brand-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-60"
            >
              {isPending ? "جارٍ التوليد… (قد يستغرق حتى دقيقة)" : preview ? "توليد صورة أخرى" : "توليد الصورة"}
            </button>
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          </div>

          {preview && (
            <div className="flex flex-wrap items-end gap-4">
              <span className="relative block h-56 w-56 overflow-hidden rounded-xl border bg-[var(--surface-sunken)]">
                <Image src={preview} alt="معاينة الصورة المولّدة" fill sizes="224px" className="object-cover" />
              </span>
              <button
                type="button"
                onClick={() => {
                  setChosen(preview);
                  setOpen(false);
                }}
                className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                استخدام هذه الصورة ✓
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
