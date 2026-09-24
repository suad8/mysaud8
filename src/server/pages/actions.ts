"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/session";
import { logAudit } from "@/server/audit/log";
import { slugify, uniqueSlug } from "@/lib/slug";

export type PageFormState = { error?: string; success?: boolean };

const MAX_CONTENT = 50_000;

/** الصفحات الأساسية التي تشير لها روابط الفوتر الافتراضية — تُنشأ كمسودات للتعبئة. */
const DEFAULT_PAGES: { slug: string; title: string }[] = [
  { slug: "about", title: "من نحن" },
  { slug: "shipping", title: "الشحن والتوصيل" },
  { slug: "returns", title: "سياسة الاستبدال والإرجاع" },
  { slug: "privacy", title: "سياسة الخصوصية" },
  { slug: "terms", title: "الشروط والأحكام" },
  { slug: "contact", title: "تواصل معنا" },
];

function revalidatePages(slug?: string) {
  revalidatePath("/admin/pages");
  if (slug) revalidatePath(`/pages/${slug}`);
}

export async function createPageAction(formData: FormData) {
  const session = await requireAdmin();
  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  if (!title) return;

  const requested = String(formData.get("slug") ?? "").trim();
  const slug = await uniqueSlug(slugify(requested || title, "page"), async (s) =>
    Boolean(await db.page.findUnique({ where: { slug: s }, select: { id: true } })),
  );
  const page = await db.page.create({ data: { title, slug, content: "", isPublished: false } });
  await logAudit({ actorId: session.sub, action: "page.created", entity: "Page", entityId: page.id, diff: { title, slug } });
  revalidatePages();
  redirect(`/admin/pages/${page.id}`);
}

export async function createDefaultPagesAction(_formData: FormData) {
  const session = await requireAdmin();
  const existing = new Set((await db.page.findMany({ select: { slug: true } })).map((p) => p.slug));
  const missing = DEFAULT_PAGES.filter((p) => !existing.has(p.slug));
  if (missing.length === 0) return;

  await db.page.createMany({
    data: missing.map((p) => ({ slug: p.slug, title: p.title, content: "", isPublished: false })),
  });
  await logAudit({ actorId: session.sub, action: "page.defaultsCreated", entity: "Page", diff: { slugs: missing.map((p) => p.slug) } });
  revalidatePages();
}

export async function updatePageAction(pageId: string, _prev: PageFormState, formData: FormData): Promise<PageFormState> {
  const session = await requireAdmin();
  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  if (!title) return { error: "عنوان الصفحة مطلوب" };

  const content = String(formData.get("content") ?? "").replace(/\r\n/g, "\n").slice(0, MAX_CONTENT);
  const isPublished = formData.get("isPublished") === "on";
  if (isPublished && !content.trim()) return { error: "لا يمكن نشر صفحة فارغة — اكتب محتواها أولاً" };

  const current = await db.page.findUnique({ where: { id: pageId }, select: { slug: true } });
  if (!current) return { error: "الصفحة غير موجودة" };

  const requestedSlug = slugify(String(formData.get("slug") ?? "").trim() || title, "page");
  let slug = current.slug;
  if (requestedSlug !== current.slug) {
    const taken = await db.page.findUnique({ where: { slug: requestedSlug }, select: { id: true } });
    if (taken) return { error: "هذا الرابط مستخدم لصفحة أخرى" };
    slug = requestedSlug;
  }

  await db.page.update({ where: { id: pageId }, data: { title, slug, content, isPublished } });
  await logAudit({ actorId: session.sub, action: "page.updated", entity: "Page", entityId: pageId, diff: { title, slug, isPublished } });
  revalidatePages(current.slug);
  if (slug !== current.slug) revalidatePages(slug);
  revalidatePath("/sitemap.xml");
  return { success: true };
}

export async function deletePageAction(pageId: string, _formData: FormData) {
  const session = await requireAdmin();
  const page = await db.page.findUnique({ where: { id: pageId }, select: { slug: true } });
  if (!page) return;
  await db.page.delete({ where: { id: pageId } });
  await logAudit({ actorId: session.sub, action: "page.deleted", entity: "Page", entityId: pageId, diff: { slug: page.slug } });
  revalidatePages(page.slug);
  redirect("/admin/pages");
}
