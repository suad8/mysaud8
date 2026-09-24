"use client";

import type { LinkOptionGroup } from "@/components/admin/FooterEditor";

const CUSTOM = "__custom";

/** اختيار وجهة رابط من صفحات المتجر (أو رابط خارجي يُكتب يدوياً). */
export function LinkSelect({
  value,
  onChange,
  linkOptions,
  label = "الرابط",
  allowEmpty = true,
}: {
  value: string;
  onChange: (href: string, optionLabel?: string) => void;
  linkOptions: LinkOptionGroup[];
  label?: string;
  allowEmpty?: boolean;
}) {
  const known = linkOptions.some((g) => g.options.some((o) => o.href === value));
  const custom = !known && value !== "";
  return (
    <div className="space-y-1.5">
      <select
        aria-label={label}
        value={known ? value : custom ? CUSTOM : ""}
        onChange={(e) => {
          const href = e.target.value;
          if (href === CUSTOM) return onChange(value || "https://");
          onChange(href, linkOptions.flatMap((g) => g.options).find((o) => o.href === href)?.label);
        }}
        className="h-10 w-full rounded-lg border bg-transparent px-2 text-sm outline-none focus:ring-2 focus:ring-brand-500/40"
      >
        <option value="">{allowEmpty ? "بدون رابط" : "اختر الوجهة…"}</option>
        {linkOptions.map((g) => (
          <optgroup key={g.group} label={g.group}>
            {g.options.map((o) => (
              <option key={o.href} value={o.href}>
                {o.label}
                {o.note ? ` (${o.note})` : ""}
              </option>
            ))}
          </optgroup>
        ))}
        <option value={CUSTOM}>رابط آخر (خارجي)…</option>
      </select>
      {custom && (
        <input
          aria-label={`${label} (يدوي)`}
          value={value}
          dir="ltr"
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://… أو /products"
          className="h-10 w-full rounded-lg border bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-brand-500/40"
        />
      )}
    </div>
  );
}
