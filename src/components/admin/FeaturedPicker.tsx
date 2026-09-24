"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { formatPrice } from "@/lib/format";

export type FeaturedCandidate = { id: string; nameAr: string; isFeatured: boolean; imageUrl: string | null; price: number };

/**
 * اختيار المنتجات البارزة وترتيبها في مكان واحد: قائمة مرقّمة بالصور،
 * أسهم للترتيب، وبحث لإضافة منتج. الترتيب هنا = ترتيب الظهور بالصفحة الرئيسية.
 */
export function FeaturedPicker({
  products,
  initialOrder,
  initialCount,
}: {
  products: FeaturedCandidate[];
  initialOrder: string[];
  initialCount: number;
}) {
  const byId = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const [selected, setSelected] = useState<string[]>(() => {
    const featured = products.filter((p) => p.isFeatured).map((p) => p.id);
    const ordered = initialOrder.filter((id) => featured.includes(id));
    return [...ordered, ...featured.filter((id) => !ordered.includes(id))];
  });
  const [count, setCount] = useState(initialCount);
  const [query, setQuery] = useState("");

  const available = products.filter((p) => !selected.includes(p.id) && p.nameAr.includes(query.trim()));

  const move = (index: number, delta: -1 | 1) =>
    setSelected((s) => {
      const target = index + delta;
      if (target < 0 || target >= s.length) return s;
      const copy = [...s];
      [copy[index], copy[target]] = [copy[target]!, copy[index]!];
      return copy;
    });

  if (products.length === 0) {
    return <p className="rounded-lg bg-[var(--surface-sunken)] p-3 text-sm text-muted">لا توجد منتجات منشورة بعد — أضف منتجاتك وانشرها أولاً، ثم اخترها هنا.</p>;
  }

  return (
    <div className="space-y-3">
      {/* كل المنتجات المنشورة مرشّحة — ما ليس في القائمة يُلغى تمييزه عند الحفظ */}
      {products.map((p) => (
        <input key={p.id} type="hidden" name="featuredCandidateId" value={p.id} />
      ))}
      {selected.map((id) => (
        <input key={id} type="hidden" name="featuredProductId" value={id} />
      ))}

      <label className="flex items-center gap-2 text-sm">
        <span className="text-xs font-medium text-muted">عدد المنتجات المعروضة بالصفحة الرئيسية:</span>
        <input
          name="featuredCount"
          type="number"
          min={1}
          max={24}
          value={count}
          onChange={(e) => setCount(Math.min(24, Math.max(1, Number(e.target.value) || 1)))}
          className="num h-9 w-20 rounded-lg border bg-transparent px-2 text-sm outline-none focus:ring-2 focus:ring-brand-500/40"
        />
      </label>

      <div className="rounded-lg border">
        <p className="border-b px-3 py-2 text-xs font-semibold">
          المعروضة الآن بالترتيب ({selected.length})
          {selected.length === 0 && <span className="font-normal text-muted"> — القسم مخفي من الرئيسية حتى تضيف منتجاً</span>}
        </p>
        <ol className="divide-y">
          {selected.map((id, i) => {
            const p = byId.get(id);
            if (!p) return null;
            const hidden = i >= count;
            return (
              <li key={id} className={`flex items-center gap-3 px-3 py-2 ${hidden ? "opacity-50" : ""}`}>
                <span className="num w-5 text-center text-xs text-muted">{i + 1}</span>
                <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-[var(--surface-sunken)]">
                  {p.imageUrl && <Image src={p.imageUrl} alt="" fill sizes="40px" className="object-cover" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{p.nameAr}</span>
                  <span className="text-xs text-muted">
                    {formatPrice(p.price)}
                    {hidden && " · لن يظهر (تجاوز العدد المحدد)"}
                  </span>
                </span>
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="grid h-8 w-8 place-items-center rounded-lg border text-sm disabled:opacity-30" aria-label="تقديم">↑</button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === selected.length - 1} className="grid h-8 w-8 place-items-center rounded-lg border text-sm disabled:opacity-30" aria-label="تأخير">↓</button>
                <button type="button" onClick={() => setSelected((s) => s.filter((x) => x !== id))} className="text-xs text-red-600 hover:underline">
                  إزالة
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="rounded-lg border">
        <div className="border-b p-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن منتج لإضافته…"
            aria-label="ابحث عن منتج"
            className="h-9 w-full rounded-lg border bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-brand-500/40"
          />
        </div>
        <ul className="max-h-56 divide-y overflow-y-auto">
          {available.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-3 py-1.5">
              <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md bg-[var(--surface-sunken)]">
                {p.imageUrl && <Image src={p.imageUrl} alt="" fill sizes="32px" className="object-cover" />}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm">{p.nameAr}</span>
              <button type="button" onClick={() => setSelected((s) => [...s, p.id])} className="text-xs font-medium text-brand-700 hover:underline">
                + إضافة
              </button>
            </li>
          ))}
          {available.length === 0 && <li className="px-3 py-2 text-xs text-muted">{query ? "لا توجد نتائج" : "كل المنتجات المنشورة مضافة"}</li>}
        </ul>
      </div>
      <p className="text-[11px] text-muted">يمكنك أيضاً تمييز منتج من صفحة تعديله (خيار «منتج مميّز») — يُضاف لآخر هذه القائمة.</p>
    </div>
  );
}
