import { db } from "@/server/db";
import type { LinkOptionGroup } from "@/components/admin/FooterEditor";

/** وجهات جاهزة لحقول الروابط في لوحة التحكم — صفحات المتجر + صفحاتك + التصنيفات (+ المنتجات اختيارياً). */
export async function getLinkOptions({ withProducts = false } = {}): Promise<LinkOptionGroup[]> {
  const [pages, categories, products] = await Promise.all([
    db.page.findMany({ select: { slug: true, title: true, isPublished: true }, orderBy: { title: "asc" } }),
    db.category.findMany({ where: { isActive: true }, select: { slug: true, nameAr: true }, orderBy: { position: "asc" } }),
    withProducts
      ? db.product.findMany({ where: { status: "ACTIVE", deletedAt: null }, select: { slug: true, nameAr: true }, orderBy: { nameAr: "asc" } })
      : Promise.resolve([]),
  ]);
  return [
    {
      group: "صفحات المتجر",
      options: [
        { label: "الرئيسية", href: "/" },
        { label: "كل المنتجات", href: "/products" },
        { label: "البحث", href: "/search" },
        { label: "السلة", href: "/cart" },
      ],
    },
    {
      group: "صفحاتك (من «الصفحات»)",
      options: pages.map((p) => ({ label: p.title, href: `/pages/${p.slug}`, note: p.isPublished ? undefined : "غير منشورة" })),
    },
    { group: "التصنيفات", options: categories.map((c) => ({ label: c.nameAr, href: `/c/${c.slug}` })) },
    { group: "المنتجات", options: products.map((p) => ({ label: p.nameAr, href: `/p/${p.slug}` })) },
  ].filter((g) => g.options.length > 0);
}
