"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/session";
import { logAudit } from "@/server/audit/log";
import { slugify, uniqueSlug } from "@/lib/slug";

const categorySlugExists = async (slug: string) => Boolean(await db.category.findUnique({ where: { slug }, select: { id: true } }));

function revalidateCategories() {
  revalidatePath("/admin/categories");
  // قائمة التصنيفات تظهر بالهيدر في كل صفحات المتجر
  revalidatePath("/", "layout");
}

export async function createCategoryAction(formData: FormData) {
  const session = await requireAdmin();
  const nameAr = String(formData.get("nameAr") ?? "").trim().slice(0, 60);
  if (!nameAr) return;

  const requestedSlug = String(formData.get("slug") ?? "").trim();
  const slug = await uniqueSlug(slugify(requestedSlug || nameAr, "category"), categorySlugExists);
  const last = await db.category.findFirst({ orderBy: { position: "desc" }, select: { position: true } });

  const category = await db.category.create({
    data: {
      nameAr,
      slug,
      descAr: String(formData.get("descAr") ?? "").trim().slice(0, 300) || null,
      position: (last?.position ?? -1) + 1,
      isActive: true,
    },
  });
  await logAudit({ actorId: session.sub, action: "category.created", entity: "Category", entityId: category.id, diff: { nameAr, slug } });
  revalidateCategories();
}

export async function updateCategoryAction(categoryId: string, formData: FormData) {
  const session = await requireAdmin();
  const nameAr = String(formData.get("nameAr") ?? "").trim().slice(0, 60);
  if (!nameAr) return;

  const position = Math.round(Number(formData.get("position")));
  await db.category.update({
    where: { id: categoryId },
    data: {
      nameAr,
      descAr: String(formData.get("descAr") ?? "").trim().slice(0, 300) || null,
      position: Number.isFinite(position) ? Math.max(0, position) : undefined,
      isActive: formData.get("isActive") === "on",
    },
  });
  await logAudit({ actorId: session.sub, action: "category.updated", entity: "Category", entityId: categoryId, diff: { nameAr } });
  revalidateCategories();
}

/** الحذف مسموح فقط لتصنيف بلا منتجات — وإلا يُكتفى بإخفائه (إلغاء التفعيل). */
export async function deleteCategoryAction(categoryId: string, _formData: FormData) {
  const session = await requireAdmin();
  const [products, children] = await Promise.all([
    db.product.count({ where: { categoryId } }),
    db.category.count({ where: { parentId: categoryId } }),
  ]);
  if (products > 0 || children > 0) return;

  await db.category.delete({ where: { id: categoryId } });
  await logAudit({ actorId: session.sub, action: "category.deleted", entity: "Category", entityId: categoryId });
  revalidateCategories();
}
