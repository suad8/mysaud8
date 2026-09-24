import Image from "next/image";
import Link from "next/link";
import { StoreLogo } from "@/components/StoreLogo";
import { NewsletterForm } from "@/components/storefront/NewsletterForm";
import { SOCIAL_ICON_PATHS } from "@/components/storefront/social-icons";
import { getStoreInfoSettings, getThemeSettings } from "@/server/settings";
import { db } from "@/server/db";
import { decodeSlug } from "@/lib/route-params";
import { SOCIAL_PLATFORM_LABEL } from "@/lib/theme";

function FooterLink({ href, label }: { href: string; label: string }) {
  const cls = "text-sm text-muted transition-colors hover:text-[var(--text-strong)]";
  if (href.startsWith("/")) return <Link href={href} className={cls}>{label}</Link>;
  // بريد/هاتف يفتح تطبيقه مباشرة؛ الروابط الخارجية في تبويب جديد
  if (/^(mailto|tel):/i.test(href)) return <a href={href} className={cls}>{label}</a>;
  return <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{label}</a>;
}

/** روابط صفحات المعلومات غير المنشورة تُخفى — لا يرى العميل صفحة فارغة أو 404. */
async function getPublishedPageSlugs(): Promise<Set<string> | null> {
  try {
    const pages = await db.page.findMany({ where: { isPublished: true }, select: { slug: true } });
    return new Set(pages.map((p) => p.slug));
  } catch {
    return null; // جدول الصفحات غير متاح بعد — تُعرض الروابط كما هي بدل تعطيل الفوتر
  }
}

export async function Footer() {
  const [storeInfo, theme, publishedPages] = await Promise.all([getStoreInfoSettings(), getThemeSettings(), getPublishedPageSlugs()]);

  const about = theme.footerAbout || storeInfo.tagline;
  const isVisibleLink = (href: string) => {
    const match = /^\/pages\/([^/?#]+)/.exec(href);
    return !match || !publishedPages || publishedPages.has(decodeSlug(match[1]!));
  };
  const columns = theme.footerColumns
    .map((c) => ({ ...c, links: c.links.filter((l) => isVisibleLink(l.href)) }))
    .filter((c) => c.text || c.links.length > 0);
  const legal = [
    theme.footerNote,
    theme.commercialRegistration && `س.ت ${theme.commercialRegistration}`,
    theme.vatNumber && `الرقم الضريبي ${theme.vatNumber}`,
  ].filter(Boolean);

  return (
    <footer className="relative mt-20 overflow-hidden border-t bg-[var(--surface-raised)]">
      <div aria-hidden className="blob -end-24 -top-24 h-72 w-72 bg-brand-50 dark:bg-brand-950/40" />

      <div className="relative mx-auto max-w-7xl px-4 py-14">
        {theme.newsletterEnabled && (
          <div className="surface-card mb-14 flex flex-col items-center gap-5 bg-brand-50 p-8 text-center dark:bg-brand-950/40 sm:flex-row sm:justify-between sm:text-start lg:p-10">
            <div>
              <h3 className="text-xl font-bold tracking-tight">{theme.newsletterTitle}</h3>
              {theme.newsletterText && <p className="mt-1.5 text-sm text-muted">{theme.newsletterText}</p>}
            </div>
            <NewsletterForm />
          </div>
        )}

        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2.5">
              <StoreLogo name={storeInfo.name} logoUrl={storeInfo.logoUrl} size={36} />
              <span className="text-lg font-bold">{storeInfo.name}</span>
            </div>
            {about && <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">{about}</p>}
            {theme.socialLinks.length > 0 && (
              <ul className="mt-5 flex flex-wrap items-center gap-2" aria-label="حسابات التواصل">
                {theme.socialLinks.map((s) => (
                  <li key={`${s.platform}-${s.url}`}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={SOCIAL_PLATFORM_LABEL[s.platform]}
                      title={SOCIAL_PLATFORM_LABEL[s.platform]}
                      className="grid h-10 w-10 place-items-center rounded-full border text-muted transition-colors hover:border-brand-400 hover:text-brand-600"
                    >
                      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden>
                        <path d={SOCIAL_ICON_PATHS[s.platform]} />
                      </svg>
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {theme.paymentLogos.length > 0 && (
              <div className="mt-6 flex flex-wrap items-center gap-2">
                {theme.paymentLogos.map((m) =>
                  m.logoUrl ? (
                    <span key={m.name} className="relative h-9 w-16 overflow-hidden rounded-lg border bg-white" title={m.name}>
                      <Image src={m.logoUrl} alt={m.name} fill sizes="64px" className="object-contain p-1.5" />
                    </span>
                  ) : (
                    <span key={m.name} className="rounded-lg border px-2.5 py-1.5 text-[11px] font-medium text-muted">
                      {m.name}
                    </span>
                  ),
                )}
              </div>
            )}
          </div>

          {columns.map((col, i) => (
            <div key={`${col.title}-${i}`}>
              {col.title && <h3 className="mb-4 text-sm font-semibold">{col.title}</h3>}
              {col.text && <p className="whitespace-pre-line text-sm leading-relaxed text-muted">{col.text}</p>}
              {col.links.length > 0 && (
                <ul className={`space-y-2.5 ${col.text ? "mt-4" : ""}`}>
                  {col.links.map((link) => (
                    <li key={`${link.label}-${link.href}`}>
                      <FooterLink href={link.href} label={link.label} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© <span className="num">{new Date().getFullYear()}</span> {storeInfo.name}. جميع الحقوق محفوظة.</p>
          {legal.length > 0 && <p>{legal.join(" · ")}</p>}
        </div>
      </div>
    </footer>
  );
}
