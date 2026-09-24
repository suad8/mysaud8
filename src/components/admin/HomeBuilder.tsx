"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { LinkSelect } from "@/components/admin/LinkSelect";
import type { LinkOptionGroup } from "@/components/admin/FooterEditor";
import { saveHomeBlocksAction, uploadHomeImageAction } from "@/server/home/actions";
import { formatPrice } from "@/lib/format";
import {
  BLOCK_META,
  BLOCK_TYPES,
  FEATURE_ICON_LABEL,
  FEATURE_ICONS,
  defaultBlockData,
  newBlockId,
  youtubeId,
  type AnyHomeBlock,
  type BlockType,
  type FeatureIcon,
  type LinkedImage,
  type ProductSource,
} from "@/lib/home-blocks";

export type BuilderProduct = { id: string; slug: string; nameAr: string; imageUrl: string | null; price: number; isFeatured: boolean };

type Props = {
  initialBlocks: AnyHomeBlock[];
  products: BuilderProduct[];
  categories: { slug: string; nameAr: string }[];
  featuredOrder: string[];
  linkOptions: LinkOptionGroup[];
  /** نموذج البانر الرئيسي (له حفظ مستقل) — يُعرض داخل قسم «البانر الرئيسي» */
  heroEditor: React.ReactNode;
};

const inputCls = "h-10 w-full rounded-lg border bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-brand-500/40";
const iconBtn = "grid h-8 w-8 place-items-center rounded-lg border text-sm transition-colors hover:bg-[var(--surface-sunken)] disabled:opacity-30";

const SOURCE_LABEL: Record<ProductSource, string> = {
  featured: "البارزة ⭐",
  newest: "الأحدث",
  sale: "عليها خصم",
  category: "من تصنيف",
  manual: "اختيار يدوي",
};

// ── حقول عامة ─────────────────────────────────────────────────
function Field({ label, value, onChange, placeholder, maxLength, dir }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; maxLength?: number; dir?: "ltr" }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} maxLength={maxLength} dir={dir} className={inputCls} />
    </label>
  );
}

function NumberField({ label, value, onChange, min, max }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Math.min(max, Math.max(min, Math.round(Number(e.target.value)) || min)))}
        className={`${inputCls} num w-28`}
      />
    </label>
  );
}

function LinkField({ label, value, onChange, links }: { label: string; value: string; onChange: (v: string) => void; links: LinkOptionGroup[] }) {
  return (
    <div className="block text-sm">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      <LinkSelect label={label} value={value} onChange={(href) => onChange(href)} linkOptions={links} />
    </div>
  );
}

/** حقل صورة: معاينة + رفع فوري للخادم + إزالة. */
function ImageField({ label, value, onChange, hint, square }: { label: string; value: string; onChange: (url: string) => void; hint?: string; square?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setBusy(true);
    setError("");
    const fd = new FormData();
    fd.set("image", file);
    try {
      const res = await uploadHomeImageAction(fd);
      if (res.url) onChange(res.url);
      else setError(res.error ?? "تعذّر رفع الصورة");
    } catch {
      setError("تعذّر رفع الصورة — تحقق من الاتصال");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="text-sm">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      <div className="flex items-center gap-3">
        <div className={`relative shrink-0 overflow-hidden rounded-lg border bg-[var(--surface-sunken)] ${square ? "h-16 w-16" : "h-16 w-28"}`}>
          {value ? <Image src={value} alt="" fill sizes="112px" className="object-cover" /> : <span className="grid h-full place-items-center text-[10px] text-muted">بلا صورة</span>}
        </div>
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <label className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-[var(--surface-sunken)] ${busy ? "pointer-events-none opacity-50" : ""}`}>
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-label={`رفع ${label}`}
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void upload(f);
                }}
              />
              {busy ? "جارٍ الرفع…" : value ? "تغيير الصورة" : "رفع صورة"}
            </label>
            {value && (
              <button type="button" onClick={() => onChange("")} className="text-xs text-muted hover:text-red-600">
                إزالة
              </button>
            )}
          </div>
          {hint && <p className="text-[11px] text-muted">{hint}</p>}
          {error && <p className="text-[11px] text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}

/** قائمة عناصر قابلة للإضافة والترتيب والحذف (شرائح، صور، مزايا…). */
function ItemList<T>({
  items,
  onChange,
  max,
  make,
  addLabel,
  render,
  itemLabel,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  max: number;
  make: () => T;
  addLabel: string;
  itemLabel: string;
  render: (item: T, set: (patch: Partial<T>) => void) => React.ReactNode;
}) {
  const move = (i: number, d: -1 | 1) => {
    const t = i + d;
    if (t < 0 || t >= items.length) return;
    const copy = [...items];
    [copy[i], copy[t]] = [copy[t]!, copy[i]!];
    onChange(copy);
  };
  return (
    <div className="space-y-2.5">
      {items.map((item, i) => (
        <div key={i} className="rounded-xl border p-3">
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-muted">
              {itemLabel} <span className="num">{i + 1}</span>
            </span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className={iconBtn} aria-label={`تقديم ${itemLabel} ${i + 1}`}>↑</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} className={iconBtn} aria-label={`تأخير ${itemLabel} ${i + 1}`}>↓</button>
              <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="px-1.5 text-xs text-red-600 hover:underline" aria-label={`حذف ${itemLabel} ${i + 1}`}>
                حذف
              </button>
            </div>
          </div>
          {render(item, (patch) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x))))}
        </div>
      ))}
      {items.length < max ? (
        <button type="button" onClick={() => onChange([...items, make()])} className="text-xs font-medium text-brand-700 hover:underline">
          + {addLabel}
        </button>
      ) : (
        <p className="text-[11px] text-muted">الحد الأقصى {max}</p>
      )}
    </div>
  );
}

/** اختيار منتجات بالترتيب: قائمة مرقّمة + بحث للإضافة. */
function ProductPicker({ products, selected, onChange, max }: { products: BuilderProduct[]; selected: string[]; onChange: (ids: string[]) => void; max: number }) {
  const [query, setQuery] = useState("");
  const byId = new Map(products.map((p) => [p.id, p]));
  const chosen = selected.filter((id) => byId.has(id));
  const available = products.filter((p) => !chosen.includes(p.id) && p.nameAr.includes(query.trim())).slice(0, 50);
  const move = (i: number, d: -1 | 1) => {
    const t = i + d;
    if (t < 0 || t >= chosen.length) return;
    const copy = [...chosen];
    [copy[i], copy[t]] = [copy[t]!, copy[i]!];
    onChange(copy);
  };

  if (products.length === 0) return <p className="rounded-lg bg-[var(--surface-sunken)] p-3 text-xs text-muted">لا توجد منتجات منشورة بعد — أضف منتجاتك وانشرها أولاً.</p>;

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <div className="rounded-lg border">
        <p className="border-b px-3 py-2 text-xs font-semibold">
          المختارة بالترتيب (<span className="num">{chosen.length}</span>)
        </p>
        <ol className="max-h-72 divide-y overflow-y-auto">
          {chosen.map((id, i) => {
            const p = byId.get(id)!;
            return (
              <li key={id} className="flex items-center gap-2 px-3 py-1.5">
                <span className="num w-4 text-center text-xs text-muted">{i + 1}</span>
                <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md bg-[var(--surface-sunken)]">
                  {p.imageUrl && <Image src={p.imageUrl} alt="" fill sizes="32px" className="object-cover" />}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">{p.nameAr}</span>
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className={iconBtn} aria-label={`تقديم ${p.nameAr}`}>↑</button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === chosen.length - 1} className={iconBtn} aria-label={`تأخير ${p.nameAr}`}>↓</button>
                <button type="button" onClick={() => onChange(chosen.filter((x) => x !== id))} className="px-1 text-xs text-red-600 hover:underline" aria-label={`إزالة ${p.nameAr}`}>
                  ✕
                </button>
              </li>
            );
          })}
          {chosen.length === 0 && <li className="px-3 py-3 text-xs text-muted">لم تختر منتجات بعد — أضفها من القائمة.</li>}
        </ol>
      </div>
      <div className="rounded-lg border">
        <div className="border-b p-2">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث عن منتج…" aria-label="ابحث عن منتج لإضافته" className="h-9 w-full rounded-lg border bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-brand-500/40" />
        </div>
        <ul className="max-h-60 divide-y overflow-y-auto">
          {available.map((p) => (
            <li key={p.id} className="flex items-center gap-2 px-3 py-1.5">
              <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md bg-[var(--surface-sunken)]">
                {p.imageUrl && <Image src={p.imageUrl} alt="" fill sizes="32px" className="object-cover" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{p.nameAr}</span>
                <span className="text-[11px] text-muted">{formatPrice(p.price)}</span>
              </span>
              <button
                type="button"
                disabled={chosen.length >= max}
                onClick={() => onChange([...chosen, p.id])}
                className="text-xs font-medium text-brand-700 hover:underline disabled:opacity-40"
                aria-label={`إضافة ${p.nameAr}`}
              >
                + إضافة
              </button>
            </li>
          ))}
          {available.length === 0 && <li className="px-3 py-2 text-xs text-muted">{query ? "لا توجد نتائج" : "كل المنتجات مضافة"}</li>}
        </ul>
      </div>
    </div>
  );
}

const emptyLinked = (): LinkedImage => ({ imageUrl: "", title: "", href: "" });

// ── المصمّم ───────────────────────────────────────────────────
export function HomeBuilder({ initialBlocks, products, categories, featuredOrder, linkOptions, heroEditor }: Props) {
  const [blocks, setBlocks] = useState<AnyHomeBlock[]>(initialBlocks);
  const [openId, setOpenId] = useState<string | null>(null);
  const [palette, setPalette] = useState(false);
  const [featured, setFeatured] = useState<string[]>(() => {
    const ids = products.filter((p) => p.isFeatured).map((p) => p.id);
    const ordered = featuredOrder.filter((id) => ids.includes(id));
    return [...ordered, ...ids.filter((id) => !ordered.includes(id))];
  });
  const [featuredDirty, setFeaturedDirty] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, startSaving] = useTransition();
  const listRef = useRef<HTMLOListElement>(null);

  // تنبيه قبل مغادرة الصفحة بتغييرات غير محفوظة
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const change = (fn: (bs: AnyHomeBlock[]) => AnyHomeBlock[]) => {
    setBlocks(fn);
    setDirty(true);
    setStatus(null);
  };
  const setData = (id: string, patch: object) => change((bs) => bs.map((b) => (b.id === id ? ({ ...b, data: { ...b.data, ...patch } } as AnyHomeBlock) : b)));
  const move = (i: number, d: -1 | 1) =>
    change((bs) => {
      const t = i + d;
      if (t < 0 || t >= bs.length) return bs;
      const copy = [...bs];
      [copy[i], copy[t]] = [copy[t]!, copy[i]!];
      return copy;
    });

  function add(type: BlockType) {
    const block = { id: newBlockId(), type, visible: true, data: defaultBlockData(type) } as AnyHomeBlock;
    change((bs) => [...bs, block]);
    setOpenId(block.id);
    setPalette(false);
    requestAnimationFrame(() => document.getElementById(`block-${block.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }

  function duplicate(i: number) {
    const src = blocks[i]!;
    const copy = { ...src, id: newBlockId(), data: structuredClone(src.data) } as AnyHomeBlock;
    change((bs) => [...bs.slice(0, i + 1), copy, ...bs.slice(i + 1)]);
    setOpenId(copy.id);
  }

  function remove(i: number) {
    const b = blocks[i]!;
    if (!window.confirm(`حذف قسم «${BLOCK_META[b.type].label}» من الصفحة الرئيسية؟`)) return;
    change((bs) => bs.filter((x) => x.id !== b.id));
  }

  function save() {
    startSaving(async () => {
      try {
        const res = await saveHomeBlocksAction({
          blocks,
          featured: featuredDirty ? { candidates: products.map((p) => p.id), ids: featured } : null,
        });
        if (res.ok && res.blocks) {
          setBlocks(res.blocks);
          setDirty(false);
          setFeaturedDirty(false);
          setStatus({ ok: true, text: "تم الحفظ ✓ — التغييرات ظاهرة في المتجر الآن" });
        } else {
          setStatus({ ok: false, text: res.error ?? "تعذّر الحفظ" });
        }
      } catch {
        setStatus({ ok: false, text: "تعذّر الحفظ — تحقق من الاتصال وحاول مجدداً" });
      }
    });
  }

  const hasHero = blocks.some((b) => b.type === "hero");
  const visibleCount = blocks.filter((b) => b.visible).length;

  function summary(b: AnyHomeBlock): string {
    switch (b.type) {
      case "products":
        return `${b.data.title || "بدون عنوان"} · ${SOURCE_LABEL[b.data.source]}`;
      case "slider":
        return `${b.data.slides.length} شريحة`;
      case "squares":
      case "brands":
        return `${b.data.items.filter((x) => x.imageUrl).length} صورة${b.data.title ? ` · ${b.data.title}` : ""}`;
      case "features":
        return b.data.items.map((x) => x.title).filter(Boolean).join("، ");
      case "banner":
      case "text":
      case "cta":
      case "countdown":
      case "video":
      case "categories":
      case "testimonials":
        return b.data.title;
      case "bundle":
        return products.find((p) => p.slug === b.data.productSlug)?.nameAr ?? "تلقائي (أحدث منتج عليه خصم)";
      default:
        return BLOCK_META[b.type].desc;
    }
  }

  function editor(b: AnyHomeBlock) {
    const id = b.id;
    switch (b.type) {
      case "hero":
        return (
          <div className="space-y-3">
            <p className="rounded-lg bg-accent-50 px-3 py-2 text-xs text-ink-800 dark:bg-accent-900/20 dark:text-accent-100">
              للبانر الرئيسي زر حفظ خاص به أسفل هذا النموذج — احفظه بعد تعديل نصوصه أو صورته.
            </p>
            {heroEditor}
          </div>
        );
      case "slider":
        return (
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={b.data.autoplay} onChange={(e) => setData(id, { autoplay: e.target.checked })} className="h-4 w-4 accent-brand-600" />
              تقليب تلقائي كل 5 ثوانٍ
            </label>
            <ItemList
              items={b.data.slides}
              onChange={(slides) => setData(id, { slides })}
              max={8}
              itemLabel="الشريحة"
              addLabel="إضافة شريحة"
              make={() => ({ imageUrl: "", title: "", subtitle: "", buttonText: "", href: "/products" })}
              render={(s, set) => (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <ImageField label="صورة الشريحة" value={s.imageUrl} onChange={(imageUrl) => set({ imageUrl })} hint="المقاس المثالي 1920×820 بكسل (عريضة)" />
                  </div>
                  <Field label="العنوان" value={s.title} onChange={(title) => set({ title })} maxLength={100} />
                  <Field label="الوصف" value={s.subtitle} onChange={(subtitle) => set({ subtitle })} maxLength={200} />
                  <Field label="نص الزر (فارغ = الصورة كلها رابط)" value={s.buttonText} onChange={(buttonText) => set({ buttonText })} maxLength={40} />
                  <LinkField label="رابط الشريحة" value={s.href} onChange={(href) => set({ href })} links={linkOptions} />
                </div>
              )}
            />
          </div>
        );
      case "banner":
        return (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <ImageField label="صورة البانر" value={b.data.imageUrl} onChange={(imageUrl) => setData(id, { imageUrl })} hint="عريضة — المقاس المثالي 1600×400 بكسل" />
            </div>
            <Field label="العنوان (اختياري — يظهر فوق الصورة)" value={b.data.title} onChange={(title) => setData(id, { title })} maxLength={100} />
            <Field label="الوصف (اختياري)" value={b.data.subtitle} onChange={(subtitle) => setData(id, { subtitle })} maxLength={200} />
            <Field label="نص الزر (اختياري)" value={b.data.buttonText} onChange={(buttonText) => setData(id, { buttonText })} maxLength={40} />
            <LinkField label="رابط البانر" value={b.data.href} onChange={(href) => setData(id, { href })} links={linkOptions} />
          </div>
        );
      case "squares":
      case "brands": {
        const isBrands = b.type === "brands";
        return (
          <div className="space-y-3">
            <Field label="عنوان القسم (اختياري)" value={b.data.title} onChange={(title) => setData(id, { title })} maxLength={100} />
            <ItemList
              items={b.data.items}
              onChange={(items) => setData(id, { items })}
              max={isBrands ? 20 : 4}
              itemLabel={isBrands ? "الشعار" : "الصورة"}
              addLabel={isBrands ? "إضافة شعار" : "إضافة صورة"}
              make={emptyLinked}
              render={(it, set) => (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <ImageField square label={isBrands ? "الشعار" : "الصورة"} value={it.imageUrl} onChange={(imageUrl) => set({ imageUrl })} hint={isBrands ? "PNG بخلفية شفافة يفضَّل" : "مربعة — 800×800 بكسل"} />
                  </div>
                  <Field label={isBrands ? "اسم العلامة (للوصف)" : "عنوان على الصورة (اختياري)"} value={it.title} onChange={(title) => set({ title })} maxLength={80} />
                  <LinkField label="الرابط" value={it.href} onChange={(href) => set({ href })} links={linkOptions} />
                </div>
              )}
            />
          </div>
        );
      }
      case "products": {
        const d = b.data;
        return (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="العنوان" value={d.title} onChange={(title) => setData(id, { title })} maxLength={100} />
              <Field label="الوصف (اختياري)" value={d.subtitle} onChange={(subtitle) => setData(id, { subtitle })} maxLength={200} />
            </div>
            <div>
              <span className="mb-1.5 block text-xs font-medium text-muted">المنتجات المعروضة</span>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="مصدر المنتجات">
                {(Object.keys(SOURCE_LABEL) as ProductSource[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={d.source === s}
                    onClick={() => setData(id, { source: s })}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium ${d.source === s ? "border-brand-600 bg-brand-600 text-white" : "hover:bg-[var(--surface-sunken)]"}`}
                  >
                    {SOURCE_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>
            {d.source === "category" && (
              <label className="block text-sm">
                <span className="mb-1 block text-xs font-medium text-muted">التصنيف</span>
                <select value={d.categorySlug} onChange={(e) => setData(id, { categorySlug: e.target.value })} className={inputCls}>
                  <option value="">اختر تصنيفاً…</option>
                  {categories.map((c) => (
                    <option key={c.slug} value={c.slug}>{c.nameAr}</option>
                  ))}
                </select>
              </label>
            )}
            {d.source === "manual" && <ProductPicker products={products} selected={d.productIds} onChange={(productIds) => setData(id, { productIds })} max={24} />}
            {d.source === "featured" && (
              <div className="space-y-2">
                <p className="text-xs text-muted">
                  قائمة «المنتجات البارزة» مشتركة لكل الأقسام — ⭐ في صفحة المنتجات يضيف المنتج لآخرها. رتّبها هنا:
                </p>
                <ProductPicker
                  products={products}
                  selected={featured}
                  onChange={(ids) => {
                    setFeatured(ids);
                    setFeaturedDirty(true);
                    setDirty(true);
                    setStatus(null);
                  }}
                  max={200}
                />
              </div>
            )}
            <div className="flex flex-wrap items-end gap-4">
              <NumberField label="عدد المنتجات" value={d.count} onChange={(count) => setData(id, { count })} min={1} max={24} />
              <div className="text-sm">
                <span className="mb-1 block text-xs font-medium text-muted">طريقة العرض</span>
                <div className="flex gap-1.5">
                  {(["grid", "slider"] as const).map((l) => (
                    <button
                      key={l}
                      type="button"
                      aria-pressed={d.layout === l}
                      onClick={() => setData(id, { layout: l })}
                      className={`h-10 rounded-lg border px-3 text-xs font-medium ${d.layout === l ? "border-brand-600 bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-200" : ""}`}
                    >
                      {l === "grid" ? "شبكة" : "شريط يتحرك أفقياً"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="نص رابط «عرض الكل» (فارغ = إخفاء)" value={d.linkText} onChange={(linkText) => setData(id, { linkText })} maxLength={40} />
              <LinkField label="رابط «عرض الكل»" value={d.linkHref} onChange={(linkHref) => setData(id, { linkHref })} links={linkOptions} />
            </div>
          </div>
        );
      }
      case "categories":
        return (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="الشارة الصغيرة" value={b.data.eyebrow} onChange={(eyebrow) => setData(id, { eyebrow })} maxLength={60} />
            <Field label="العنوان" value={b.data.title} onChange={(title) => setData(id, { title })} maxLength={100} />
            <p className="text-[11px] text-muted sm:col-span-2">تظهر التصنيفات الرئيسية المفعّلة بترتيبها في صفحة «التصنيفات».</p>
          </div>
        );
      case "features":
        return (
          <ItemList
            items={b.data.items}
            onChange={(items) => setData(id, { items })}
            max={8}
            itemLabel="الميزة"
            addLabel="إضافة ميزة"
            make={() => ({ icon: "star" as FeatureIcon, title: "", desc: "" })}
            render={(it, set) => (
              <div className="space-y-2.5">
                <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="أيقونة الميزة">
                  {(Object.keys(FEATURE_ICONS) as FeatureIcon[]).map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      role="radio"
                      aria-checked={it.icon === ic}
                      title={FEATURE_ICON_LABEL[ic]}
                      aria-label={FEATURE_ICON_LABEL[ic]}
                      onClick={() => set({ icon: ic })}
                      className={`grid h-9 w-9 place-items-center rounded-lg border ${it.icon === ic ? "border-brand-600 bg-brand-50 dark:bg-brand-950" : ""}`}
                    >
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5 stroke-brand-600">
                        <path d={FEATURE_ICONS[ic]} />
                      </svg>
                    </button>
                  ))}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Field label="العنوان" value={it.title} onChange={(title) => set({ title })} maxLength={60} />
                  <Field label="الوصف" value={it.desc} onChange={(desc) => set({ desc })} maxLength={120} />
                </div>
              </div>
            )}
          />
        );
      case "testimonials":
        return (
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="الشارة الصغيرة" value={b.data.eyebrow} onChange={(eyebrow) => setData(id, { eyebrow })} maxLength={60} />
            <Field label="العنوان" value={b.data.title} onChange={(title) => setData(id, { title })} maxLength={100} />
            <NumberField label="عدد التقييمات" value={b.data.count} onChange={(count) => setData(id, { count })} min={1} max={12} />
            <p className="text-[11px] text-muted sm:col-span-3">تُعرض أحدث التقييمات المعتمدة (4 نجوم فأكثر) التي فيها تعليق.</p>
          </div>
        );
      case "text":
        return (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="العنوان" value={b.data.title} onChange={(title) => setData(id, { title })} maxLength={120} />
            </div>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block text-xs font-medium text-muted">النص</span>
              <textarea value={b.data.body} onChange={(e) => setData(id, { body: e.target.value })} rows={4} maxLength={2000} className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500/40" />
            </label>
            <Field label="نص الزر (اختياري)" value={b.data.buttonText} onChange={(buttonText) => setData(id, { buttonText })} maxLength={40} />
            <LinkField label="رابط الزر" value={b.data.href} onChange={(href) => setData(id, { href })} links={linkOptions} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={b.data.align === "center"} onChange={(e) => setData(id, { align: e.target.checked ? "center" : "start" })} className="h-4 w-4 accent-brand-600" />
              توسيط النص
            </label>
          </div>
        );
      case "video": {
        const valid = youtubeId(b.data.youtubeUrl);
        return (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="العنوان (اختياري)" value={b.data.title} onChange={(title) => setData(id, { title })} maxLength={100} />
            <div>
              <Field label="رابط الفيديو من يوتيوب" value={b.data.youtubeUrl} onChange={(youtubeUrl) => setData(id, { youtubeUrl })} placeholder="https://www.youtube.com/watch?v=…" dir="ltr" />
              {b.data.youtubeUrl && (
                <p className={`mt-1 text-[11px] ${valid ? "text-emerald-600" : "text-red-600"}`}>{valid ? "✓ رابط صحيح" : "الرابط غير صحيح — انسخه من زر «مشاركة» في يوتيوب"}</p>
              )}
            </div>
          </div>
        );
      }
      case "countdown":
        return (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="العنوان" value={b.data.title} onChange={(title) => setData(id, { title })} maxLength={100} />
            <Field label="الوصف" value={b.data.subtitle} onChange={(subtitle) => setData(id, { subtitle })} maxLength={200} />
            <label className="block text-sm">
              <span className="mb-1 block text-xs font-medium text-muted">ينتهي العرض في (بتوقيت السعودية)</span>
              <input type="datetime-local" value={b.data.endsAt} onChange={(e) => setData(id, { endsAt: e.target.value })} className={`${inputCls} num`} dir="ltr" />
              <span className="mt-1 block text-[11px] text-muted">يختفي القسم تلقائياً بعد انتهاء الوقت.</span>
            </label>
            <div className="grid gap-3">
              <Field label="نص الزر" value={b.data.buttonText} onChange={(buttonText) => setData(id, { buttonText })} maxLength={40} />
              <LinkField label="رابط الزر" value={b.data.href} onChange={(href) => setData(id, { href })} links={linkOptions} />
            </div>
          </div>
        );
      case "cta":
        return (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="العنوان" value={b.data.title} onChange={(title) => setData(id, { title })} maxLength={120} />
            <Field label="النص" value={b.data.text} onChange={(text) => setData(id, { text })} maxLength={400} />
            <Field label="نص الزر" value={b.data.buttonText} onChange={(buttonText) => setData(id, { buttonText })} maxLength={40} />
            <LinkField label="رابط الزر" value={b.data.href} onChange={(href) => setData(id, { href })} links={linkOptions} />
          </div>
        );
      case "bundle":
        return (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block text-xs font-medium text-muted">المنتج المعروض</span>
              <select value={b.data.productSlug} onChange={(e) => setData(id, { productSlug: e.target.value })} className={inputCls}>
                <option value="">تلقائي (أحدث منتج عليه خصم)</option>
                {products.map((p) => (
                  <option key={p.slug} value={p.slug}>{p.nameAr}</option>
                ))}
              </select>
            </label>
            <Field label="الشارة" value={b.data.badge} onChange={(badge) => setData(id, { badge })} maxLength={60} />
            <Field label="نص الزر" value={b.data.ctaText} onChange={(ctaText) => setData(id, { ctaText })} maxLength={40} />
          </div>
        );
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          <span className="num font-semibold text-[var(--text-strong)]">{blocks.length}</span> قسم ·{" "}
          <span className="num">{visibleCount}</span> ظاهر في المتجر — رتّبها بالأسهم، واضغط على أي قسم لتعديله.
        </p>
        <div className="flex gap-2">
          <a href="/" target="_blank" rel="noopener" className="rounded-full border px-4 py-2 text-xs font-semibold hover:bg-[var(--surface-sunken)]">
            معاينة المتجر ↗
          </a>
          <button type="button" onClick={() => setPalette((p) => !p)} aria-expanded={palette} className="rounded-full bg-brand-700 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-800">
            + إضافة قسم
          </button>
        </div>
      </div>

      {palette && (
        <div className="surface-card p-4">
          <p className="mb-3 text-sm font-semibold">اختر نوع القسم</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {BLOCK_TYPES.filter((t) => t !== "hero" || !hasHero).map((t) => (
              <button key={t} type="button" data-block-add={t} onClick={() => add(t)} className="flex items-start gap-3 rounded-xl border p-3 text-start transition-colors hover:border-brand-400 hover:bg-brand-50/50 dark:hover:bg-brand-950/40">
                <span className="text-xl" aria-hidden>{BLOCK_META[t].icon}</span>
                <span>
                  <span className="block text-sm font-semibold">{BLOCK_META[t].label}</span>
                  <span className="block text-xs text-muted">{BLOCK_META[t].desc}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {blocks.length === 0 && (
        <div className="surface-card p-10 text-center">
          <p className="text-sm font-semibold">الصفحة الرئيسية فارغة</p>
          <p className="mt-1 text-xs text-muted">اضغط «+ إضافة قسم» لبناء صفحتك.</p>
        </div>
      )}

      <ol ref={listRef} className="space-y-2.5">
        {blocks.map((b, i) => {
          const meta = BLOCK_META[b.type];
          const open = openId === b.id;
          return (
            <li key={b.id} id={`block-${b.id}`} data-block-type={b.type} className={`surface-card overflow-hidden ${b.visible ? "" : "opacity-70"}`}>
              <div className="flex items-center gap-2 p-3">
                <span className="num w-5 text-center text-xs text-muted">{i + 1}</span>
                <button type="button" onClick={() => setOpenId(open ? null : b.id)} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-3 text-start">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--surface-sunken)] text-lg" aria-hidden>
                    {meta.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      {meta.label}
                      {!b.visible && <span className="rounded-full bg-ink-100 px-2 py-px text-[10px] font-medium text-muted dark:bg-ink-800">مخفي</span>}
                    </span>
                    <span className="block truncate text-xs text-muted">{summary(b)}</span>
                  </span>
                </button>
                <div className="flex shrink-0 items-center gap-1">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className={iconBtn} aria-label={`تحريك ${meta.label} للأعلى`}>↑</button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === blocks.length - 1} className={iconBtn} aria-label={`تحريك ${meta.label} للأسفل`}>↓</button>
                  <button
                    type="button"
                    onClick={() => change((bs) => bs.map((x) => (x.id === b.id ? { ...x, visible: !x.visible } : x)))}
                    className={iconBtn}
                    aria-label={b.visible ? `إخفاء ${meta.label}` : `إظهار ${meta.label}`}
                    title={b.visible ? "إخفاء من المتجر" : "إظهار في المتجر"}
                  >
                    {b.visible ? (
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" className="h-4 w-4 stroke-current"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" className="h-4 w-4 stroke-current"><path d="M3 3l18 18M10.6 5.1A10.4 10.4 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>
                    )}
                  </button>
                  {b.type !== "hero" && (
                    <button type="button" onClick={() => duplicate(i)} className={iconBtn} aria-label={`تكرار ${meta.label}`} title="تكرار">
                      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" className="h-4 w-4 stroke-current"><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></svg>
                    </button>
                  )}
                  <button type="button" onClick={() => remove(i)} className={`${iconBtn} text-red-600 hover:bg-red-50 dark:hover:bg-red-950`} aria-label={`حذف ${meta.label}`} title="حذف">
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" className="h-4 w-4 stroke-current"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>
                  </button>
                </div>
              </div>
              {open && <div className="border-t p-4">{editor(b)}</div>}
            </li>
          );
        })}
      </ol>

      {/* شريط الحفظ الثابت */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-[var(--surface-raised)]/95 backdrop-blur lg:start-64">
        <div className="flex items-center justify-between gap-3 px-5 py-3 lg:px-8">
          <p className="text-sm" role="status">
            {status ? (
              <span className={status.ok ? "text-emerald-600" : "text-red-600"}>{status.text}</span>
            ) : dirty ? (
              <span className="font-medium text-amber-600">لديك تغييرات غير محفوظة</span>
            ) : (
              <span className="text-muted">كل التغييرات محفوظة.</span>
            )}
          </p>
          <Button type="button" onClick={save} disabled={saving || !dirty}>
            {saving ? "جارٍ الحفظ…" : "حفظ الصفحة الرئيسية"}
          </Button>
        </div>
      </div>
    </div>
  );
}
