import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/server/db";
import { decodeSlug } from "@/lib/route-params";

type Props = { params: Promise<{ slug: string }> };

async function getPublishedPage(slug: string) {
  return db.page.findFirst({ where: { slug, isPublished: true } });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await getPublishedPage(decodeSlug((await params).slug));
  return { title: page?.title ?? "صفحة" };
}

export default async function InfoPage({ params }: Props) {
  const page = await getPublishedPage(decodeSlug((await params).slug));
  if (!page) notFound();

  // فقرات مفصولة بسطر فارغ — نص عادي فقط، لا يُفسَّر كـ HTML
  const paragraphs = page.content.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <nav className="flex items-center gap-2 text-xs text-muted">
        <Link href="/" className="hover:text-[var(--text-strong)]">الرئيسية</Link>
        <span>/</span>
        <span className="text-[var(--text-strong)]">{page.title}</span>
      </nav>
      <h1 className="mt-4 text-3xl font-bold tracking-tight">{page.title}</h1>
      <article className="mt-8 space-y-5 text-[15px] leading-loose text-[var(--text-strong)]">
        {paragraphs.map((p, i) => (
          <p key={i} className="whitespace-pre-line">{p}</p>
        ))}
      </article>
    </div>
  );
}
