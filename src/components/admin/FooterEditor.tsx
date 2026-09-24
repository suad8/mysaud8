"use client";

import { useEffect, useState } from "react";
import { SOCIAL_PLATFORMS, SOCIAL_PLATFORM_LABEL, type FooterColumn, type SocialLink, type SocialPlatform } from "@/lib/theme";

export type LinkOptionGroup = { group: string; options: { label: string; href: string; note?: string }[] };

type EditableLink = { key: string; label: string; href: string };
type EditableColumn = { key: string; title: string; text: string; links: EditableLink[] };
type EditableSocial = { key: string; platform: SocialPlatform; url: string };

let seq = 0;
const k = (p: string) => `${p}-${++seq}`;

const MAX_COLUMNS = 6;
const MAX_LINKS = 15;
const MAX_SOCIAL = 12;

const inputCls = "h-10 w-full rounded-lg border bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-brand-500/40";
const smallBtn = "text-xs font-medium text-brand-700 hover:underline disabled:opacity-40 disabled:no-underline";

const toEditableColumns = (cols: FooterColumn[]): EditableColumn[] =>
  cols.map((c) => ({ key: k("col"), title: c.title, text: c.text, links: c.links.map((l) => ({ key: k("link"), ...l })) }));
const toEditableSocial = (links: SocialLink[]): EditableSocial[] => links.map((l) => ({ key: k("social"), ...l }));

/**
 * محرّر الفوتر: أعمدة بعدد مرن (عنوان + نص حر + روابط يمكن اختيارها من
 * صفحات المتجر) وحسابات التواصل. يُرسَل كـ JSON في حقول مخفية ضمن نموذج الثيم.
 */
export function FooterEditor({
  initialColumns,
  initialSocial,
  savedSocial,
  linkOptions,
}: {
  initialColumns: FooterColumn[];
  initialSocial: SocialLink[];
  /** حسابات التواصل بعد تطبيعها على الخادم (رقم واتساب ← رابط wa.me) — تُعرض بعد الحفظ */
  savedSocial?: SocialLink[];
  linkOptions: LinkOptionGroup[];
}) {
  const [columns, setColumns] = useState(() => toEditableColumns(initialColumns));
  const [social, setSocial] = useState(() => toEditableSocial(initialSocial));

  useEffect(() => {
    if (savedSocial) setSocial(toEditableSocial(savedSocial));
  }, [savedSocial]);

  const updateColumn = (key: string, patch: Partial<Omit<EditableColumn, "key" | "links">>) =>
    setColumns((cs) => cs.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  const updateLinks = (key: string, fn: (links: EditableLink[]) => EditableLink[]) =>
    setColumns((cs) => cs.map((c) => (c.key === key ? { ...c, links: fn(c.links) } : c)));
  const moveColumn = (index: number, delta: -1 | 1) =>
    setColumns((cs) => {
      const target = index + delta;
      if (target < 0 || target >= cs.length) return cs;
      const copy = [...cs];
      [copy[index], copy[target]] = [copy[target]!, copy[index]!];
      return copy;
    });

  const columnsJson = JSON.stringify(columns.map(({ title, text, links }) => ({ title, text, links: links.map(({ label, href }) => ({ label, href })) })));
  const socialJson = JSON.stringify(social.map(({ platform, url }) => ({ platform, url })));

  return (
    <>
      <input type="hidden" name="footerColumnsJson" value={columnsJson} />
      <input type="hidden" name="socialLinksJson" value={socialJson} />

      <div className="rounded-xl border p-4">
        <p className="text-sm font-semibold">حسابات التواصل</p>
        <p className="mt-0.5 text-xs text-muted">تظهر كأيقونات تحت نبذة المتجر. اكتب رابط الحساب أو اسمه (@name)، ولواتساب رقم الجوال (05xxxxxxxx).</p>
        <div className="mt-3 space-y-2.5">
          {social.map((row) => (
            <div key={row.key} className="flex flex-wrap items-center gap-2">
              <select
                aria-label="المنصة"
                value={row.platform}
                onChange={(e) => setSocial((s) => s.map((x) => (x.key === row.key ? { ...x, platform: e.target.value as SocialPlatform } : x)))}
                className="h-10 w-36 rounded-lg border bg-transparent px-2 text-sm outline-none focus:ring-2 focus:ring-brand-500/40"
              >
                {SOCIAL_PLATFORMS.map((p) => (
                  <option key={p} value={p}>{SOCIAL_PLATFORM_LABEL[p]}</option>
                ))}
              </select>
              <input
                aria-label="رابط الحساب"
                value={row.url}
                dir="ltr"
                onChange={(e) => setSocial((s) => s.map((x) => (x.key === row.key ? { ...x, url: e.target.value } : x)))}
                placeholder={row.platform === "whatsapp" ? "05xxxxxxxx" : "https://… أو ‎@name"}
                className={`${inputCls} min-w-[200px] flex-1`}
              />
              <button type="button" onClick={() => setSocial((s) => s.filter((x) => x.key !== row.key))} className="text-xs text-red-600 hover:underline">
                حذف
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          disabled={social.length >= MAX_SOCIAL}
          onClick={() => setSocial((s) => [...s, { key: k("social"), platform: SOCIAL_PLATFORMS.find((p) => !s.some((x) => x.platform === p)) ?? "instagram", url: "" }])}
          className={`mt-3 ${smallBtn}`}
        >
          + إضافة حساب
        </button>
      </div>

      <div className="rounded-xl border p-4">
        <p className="text-sm font-semibold">أعمدة الفوتر</p>
        <p className="mt-0.5 text-xs text-muted">
          لكل عمود عنوان، ونص حر اختياري (ساعات العمل، العنوان، ملخص سياسة الاسترجاع…)، وروابط. اختر الرابط من صفحاتك مباشرة —
          أنشئ أي صفحة (سياسة الاسترجاع، الضمان، الأسئلة الشائعة) من «الصفحات» ثم أضفها هنا. روابط الصفحات غير المنشورة تُخفى تلقائياً.
        </p>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {columns.map((col, i) => (
            <div key={col.key} className="space-y-2.5 rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <input
                  aria-label={`عنوان العمود ${i + 1}`}
                  value={col.title}
                  onChange={(e) => updateColumn(col.key, { title: e.target.value })}
                  placeholder={`عنوان العمود ${i + 1}`}
                  className={`${inputCls} flex-1 font-medium`}
                />
                <button type="button" onClick={() => moveColumn(i, -1)} disabled={i === 0} className="h-10 w-8 rounded-lg text-muted hover:bg-[var(--surface-sunken)] disabled:opacity-30" aria-label="تقديم العمود">
                  →
                </button>
                <button type="button" onClick={() => moveColumn(i, 1)} disabled={i === columns.length - 1} className="h-10 w-8 rounded-lg text-muted hover:bg-[var(--surface-sunken)] disabled:opacity-30" aria-label="تأخير العمود">
                  ←
                </button>
                <button type="button" onClick={() => setColumns((cs) => cs.filter((c) => c.key !== col.key))} className="text-xs text-red-600 hover:underline">
                  حذف العمود
                </button>
              </div>

              <textarea
                aria-label="نص حر"
                value={col.text}
                onChange={(e) => updateColumn(col.key, { text: e.target.value })}
                rows={2}
                maxLength={600}
                placeholder="نص حر (اختياري) — مثال: الاستبدال خلال 7 أيام من الاستلام"
                className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500/40"
              />

              <div className="space-y-2">
                {col.links.map((link) => (
                  <div key={link.key} className="grid grid-cols-[1fr_1fr_auto] items-center gap-1.5">
                    <input
                      aria-label="نص الرابط"
                      value={link.label}
                      onChange={(e) => updateLinks(col.key, (ls) => ls.map((l) => (l.key === link.key ? { ...l, label: e.target.value } : l)))}
                      placeholder="نص الرابط"
                      className={inputCls}
                    />
                    <select
                      aria-label="وجهة الرابط"
                      value={linkOptions.some((g) => g.options.some((o) => o.href === link.href)) ? link.href : link.href ? "__custom" : ""}
                      onChange={(e) => {
                        const href = e.target.value;
                        if (href === "__custom") return updateLinks(col.key, (ls) => ls.map((l) => (l.key === link.key ? { ...l, href: l.href || "https://" } : l)));
                        const option = linkOptions.flatMap((g) => g.options).find((o) => o.href === href);
                        updateLinks(col.key, (ls) => ls.map((l) => (l.key === link.key ? { ...l, href, label: l.label || option?.label || "" } : l)));
                      }}
                      className="h-10 w-full rounded-lg border bg-transparent px-2 text-sm outline-none focus:ring-2 focus:ring-brand-500/40"
                    >
                      <option value="">اختر الوجهة…</option>
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
                      <option value="__custom">رابط آخر (خارجي، بريد، هاتف)…</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => updateLinks(col.key, (ls) => ls.filter((l) => l.key !== link.key))}
                      className="grid h-10 w-8 place-items-center rounded-lg text-muted hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                      aria-label="حذف الرابط"
                    >
                      ✕
                    </button>
                    {!linkOptions.some((g) => g.options.some((o) => o.href === link.href)) && link.href !== "" && (
                      <input
                        aria-label="الرابط"
                        value={link.href}
                        dir="ltr"
                        onChange={(e) => updateLinks(col.key, (ls) => ls.map((l) => (l.key === link.key ? { ...l, href: e.target.value } : l)))}
                        placeholder="https://… أو mailto:… أو tel:…"
                        className={`${inputCls} col-span-2`}
                      />
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                disabled={col.links.length >= MAX_LINKS}
                onClick={() => updateLinks(col.key, (ls) => [...ls, { key: k("link"), label: "", href: "" }])}
                className={smallBtn}
              >
                + إضافة رابط
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          disabled={columns.length >= MAX_COLUMNS}
          onClick={() => setColumns((cs) => [...cs, { key: k("col"), title: "", text: "", links: [] }])}
          className={`mt-4 ${smallBtn}`}
        >
          + إضافة عمود
        </button>
      </div>
    </>
  );
}
