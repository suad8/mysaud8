"use client";

import { useState } from "react";
import {
  MAX_COMBINATIONS,
  MAX_OPTION_GROUPS,
  MAX_OPTION_VALUES,
  optionCombinations,
  optionKey,
  optionLabel,
  sanitizeOptionGroups,
  type OptionGroup,
  type OptionSelection,
} from "@/lib/product-options";

export type EditorVariant = { id: string; nameAr: string; options: OptionSelection; price: string; stock: number };

type Group = { key: string; name: string; values: string[]; draft: string };
type RowData = { id: string | null; price: string; stock: string };

let seq = 0;
const gk = () => `g-${++seq}`;
const LEGACY_GROUP = "الخيار";
const SUGGESTED = ["المقاس", "اللون", "الكمية", "نوع الورق", "الطباعة"];

const inputCls = "h-10 w-full rounded-lg border bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-brand-500/40";

/** يبني الحالة الأولية — بما فيها المنتجات القديمة ذات الخيارات المسطّحة (تتحول لمجموعة واحدة «الخيار»). */
function initialState(groups: OptionGroup[], variants: EditorVariant[]) {
  let effective = groups;
  let withOptions = variants;
  if (effective.length === 0 && variants.length > 1) {
    effective = [{ name: LEGACY_GROUP, values: [...new Set(variants.map((v) => v.nameAr))] }];
    withOptions = variants.map((v) => ({ ...v, options: { [LEGACY_GROUP]: v.nameAr } }));
  }
  const rows: Record<string, RowData> = {};
  for (const v of withOptions) rows[optionKey(effective, v.options)] = { id: v.id, price: v.price, stock: String(v.stock) };
  return { groups: effective.map((g) => ({ key: gk(), name: g.name, values: g.values, draft: "" })), rows };
}

/**
 * محرّر خيارات المنتج: مجموعات (المقاس، الكمية…) بقيمها، وتُولَّد كل التركيبات
 * تلقائياً بسعر ومخزون لكل تركيبة. يرسل البيانات للخادم في حقول النموذج نفسه.
 */
export function OptionsEditor({
  enabled,
  onEnabledChange,
  initialGroups,
  initialVariants,
  getBasePrice,
}: {
  enabled: boolean;
  onEnabledChange: (on: boolean) => void;
  initialGroups: OptionGroup[];
  initialVariants: EditorVariant[];
  getBasePrice: () => string;
}) {
  const [init] = useState(() => initialState(initialGroups, initialVariants));
  const [groups, setGroups] = useState<Group[]>(init.groups);
  const [rowData, setRowData] = useState<Record<string, RowData>>(init.rows);
  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkStock, setBulkStock] = useState("");

  const clean = sanitizeOptionGroups(groups.map(({ name, values }) => ({ name, values })));
  const combos = optionCombinations(clean).slice(0, MAX_COMBINATIONS + 1);
  const tooMany = combos.length > MAX_COMBINATIONS;
  const rows = combos.slice(0, MAX_COMBINATIONS).map((options) => {
    const key = optionKey(clean, options);
    return { key, options, label: optionLabel(clean, options), ...(rowData[key] ?? { id: null, price: getBasePrice(), stock: "0" }) };
  });
  const usedIds = new Set(rows.map((r) => r.id).filter(Boolean));
  const removedIds = initialVariants.map((v) => v.id).filter((id) => !usedIds.has(id));
  const duplicateNames = groups.map((g) => g.name.trim()).filter((n, i, all) => n && all.indexOf(n) !== i);

  const updateGroup = (key: string, patch: Partial<Group>) => setGroups((gs) => gs.map((g) => (g.key === key ? { ...g, ...patch } : g)));
  const addValues = (key: string) =>
    setGroups((gs) =>
      gs.map((g) => {
        if (g.key !== key) return g;
        const incoming = g.draft.split(/[,،]/).map((v) => v.trim()).filter(Boolean);
        const values = [...new Set([...g.values, ...incoming])].slice(0, MAX_OPTION_VALUES);
        return { ...g, values, draft: "" };
      }),
    );
  const updateRow = (key: string, patch: Partial<RowData>) =>
    setRowData((rd) => {
      const row = rows.find((r) => r.key === key)!;
      return { ...rd, [key]: { id: row.id, price: row.price, stock: row.stock, ...patch } };
    });
  const applyAll = (patch: Partial<RowData>) =>
    setRowData((rd) => Object.fromEntries(rows.map((r) => [r.key, { ...(rd[r.key] ?? { id: r.id, price: r.price, stock: r.stock }), ...patch }])));

  function toggle(on: boolean) {
    onEnabledChange(on);
    if (on && groups.length === 0) setGroups([{ key: gk(), name: "", values: [], draft: "" }]);
  }

  return (
    <section className="surface-card p-5">
      <label className="flex items-center gap-2.5 text-sm font-medium">
        <input type="checkbox" checked={enabled} onChange={(e) => toggle(e.target.checked)} className="h-4 w-4 accent-brand-600" />
        هذا المنتج له خيارات (مقاس، لون، كمية…) بأسعار مختلفة
      </label>
      <input type="hidden" name="multiOption" value={enabled ? "on" : ""} />

      {enabled && (
        <div className="mt-4 space-y-4">
          <input type="hidden" name="optionGroups" value={JSON.stringify(clean)} />
          {removedIds.map((id) => (
            <input key={id} type="hidden" name="removeVariantId" value={id} />
          ))}

          <div className="space-y-3">
            {groups.map((g, i) => (
              <div key={g.key} className="rounded-xl border p-3">
                <div className="flex items-center gap-2">
                  <span className="num text-xs text-muted">{i + 1}</span>
                  <input
                    aria-label="اسم مجموعة الخيارات"
                    value={g.name}
                    onChange={(e) => updateGroup(g.key, { name: e.target.value })}
                    placeholder="اسم المجموعة — مثال: المقاس"
                    className={`${inputCls} flex-1 font-medium ${duplicateNames.includes(g.name.trim()) ? "border-red-400" : ""}`}
                  />
                  <button type="button" onClick={() => setGroups((gs) => gs.filter((x) => x.key !== g.key))} className="text-xs text-red-600 hover:underline">
                    حذف
                  </button>
                </div>
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  {g.values.map((v) => (
                    <span key={v} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-800 dark:bg-brand-950 dark:text-brand-200">
                      {v}
                      <button
                        type="button"
                        aria-label={`حذف القيمة ${v}`}
                        onClick={() => updateGroup(g.key, { values: g.values.filter((x) => x !== v) })}
                        className="text-brand-500 hover:text-red-600"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                  <input
                    aria-label="قيمة جديدة"
                    value={g.draft}
                    onChange={(e) => updateGroup(g.key, { draft: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addValues(g.key);
                      }
                    }}
                    placeholder={g.values.length ? "قيمة أخرى…" : "اكتب قيمة ثم Enter — مثال: 9 أونص"}
                    className="h-8 min-w-40 flex-1 rounded-lg border bg-transparent px-2.5 text-xs outline-none focus:ring-2 focus:ring-brand-500/40"
                  />
                  <button type="button" onClick={() => addValues(g.key)} className="rounded-lg border px-2.5 py-1 text-xs font-medium hover:bg-[var(--surface-sunken)]">
                    + إضافة
                  </button>
                </div>
              </div>
            ))}
          </div>

          {groups.length < MAX_OPTION_GROUPS && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setGroups((gs) => [...gs, { key: gk(), name: "", values: [], draft: "" }])}
                className="font-medium text-brand-700 hover:underline"
              >
                + إضافة مجموعة خيارات
              </button>
              <span className="text-muted">أو اختر:</span>
              {SUGGESTED.filter((n) => !groups.some((g) => g.name.trim() === n)).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setGroups((gs) => [...gs, { key: gk(), name: n, values: [], draft: "" }])}
                  className="rounded-full border px-2.5 py-0.5 hover:bg-[var(--surface-sunken)]"
                >
                  {n}
                </button>
              ))}
            </div>
          )}

          {duplicateNames.length > 0 && <p className="text-xs text-red-600">اسم المجموعة «{duplicateNames[0]}» مكرر — كل مجموعة باسم مختلف.</p>}
          {tooMany && <p className="text-xs text-red-600">عدد التركيبات تجاوز {MAX_COMBINATIONS} — قلّل عدد القيم.</p>}

          {rows.length > 0 ? (
            <div className="rounded-xl border">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
                <p className="text-sm font-semibold">
                  التركيبات <span className="num text-xs font-normal text-muted">({rows.length})</span>
                </p>
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <input value={bulkPrice} onChange={(e) => setBulkPrice(e.target.value)} inputMode="decimal" placeholder="سعر للكل" className="num h-8 w-20 rounded-lg border bg-transparent px-2" />
                  <button type="button" onClick={() => bulkPrice && applyAll({ price: bulkPrice })} className="rounded-lg border px-2 py-1 hover:bg-[var(--surface-sunken)]">تطبيق</button>
                  <input value={bulkStock} onChange={(e) => setBulkStock(e.target.value)} inputMode="numeric" placeholder="مخزون للكل" className="num h-8 w-20 rounded-lg border bg-transparent px-2" />
                  <button type="button" onClick={() => bulkStock !== "" && applyAll({ stock: bulkStock })} className="rounded-lg border px-2 py-1 hover:bg-[var(--surface-sunken)]">تطبيق</button>
                </div>
              </div>
              <div className="divide-y">
                {rows.map((r) => (
                  <div key={r.key} className="flex items-center gap-2.5 px-3 py-2">
                    <input type="hidden" name="variantId" value={r.id ?? ""} />
                    <input type="hidden" name="variantOptions" value={JSON.stringify(r.options)} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{r.label}</span>
                    <label className="flex items-center gap-1 text-[11px] text-muted">
                      السعر
                      <input
                        name="variantPrice"
                        value={r.price}
                        onChange={(e) => updateRow(r.key, { price: e.target.value })}
                        inputMode="decimal"
                        aria-label={`سعر ${r.label}`}
                        className="num h-9 w-24 rounded-lg border bg-transparent px-2.5 text-sm text-[var(--text-strong)] outline-none focus:ring-2 focus:ring-brand-500/40"
                      />
                    </label>
                    <label className="flex items-center gap-1 text-[11px] text-muted">
                      المخزون
                      <input
                        name="variantStock"
                        value={r.stock}
                        onChange={(e) => updateRow(r.key, { stock: e.target.value })}
                        inputMode="numeric"
                        aria-label={`مخزون ${r.label}`}
                        className="num h-9 w-20 rounded-lg border bg-transparent px-2.5 text-sm text-[var(--text-strong)] outline-none focus:ring-2 focus:ring-brand-500/40"
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="rounded-lg bg-[var(--surface-sunken)] px-3 py-2 text-xs text-muted">
              أضف اسم مجموعة وقيمة واحدة على الأقل — تظهر التركيبات هنا تلقائياً لتحدد سعر ومخزون كل واحدة.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
