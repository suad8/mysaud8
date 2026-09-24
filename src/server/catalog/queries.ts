import { db } from "@/server/db";
import type { ProductCardData } from "@/components/storefront/ProductCard";
import { Prisma } from "@prisma/client";

/** الحقول اللازمة لعرض بطاقة منتج — نطلبها فقط بدل تحميل المنتج كاملاً. */
const cardSelect = {
  slug: true,
  nameAr: true,
  shortDescAr: true,
  basePrice: true,
  comparePrice: true,
  images: { select: { url: true }, orderBy: { position: "asc" }, take: 1 },
  variants: { select: { inventory: { select: { onHand: true, reserved: true } } } },
  reviews: { where: { isApproved: true }, select: { rating: true } },
} satisfies Prisma.ProductSelect;

type CardRow = Prisma.ProductGetPayload<{ select: typeof cardSelect }>;

function toCard(p: CardRow): ProductCardData {
  const available = p.variants.reduce(
    (sum, v) => sum + Math.max(0, (v.inventory?.onHand ?? 0) - (v.inventory?.reserved ?? 0)),
    0,
  );
  const ratings = p.reviews.map((r) => r.rating);
  const rating = ratings.length
    ? ratings.reduce((a, b) => a + b, 0) / ratings.length
    : 0;

  return {
    slug: p.slug,
    nameAr: p.nameAr,
    shortDescAr: p.shortDescAr,
    imageUrl: p.images[0]?.url ?? "/products/placeholder.svg",
    price: Number(p.basePrice),
    comparePrice: p.comparePrice == null ? null : Number(p.comparePrice),
    rating,
    reviewCount: ratings.length,
    available,
  };
}

const LIVE = { status: "ACTIVE", deletedAt: null } as const;

export async function getFeaturedProducts(limit = 8): Promise<ProductCardData[]> {
  const rows = await db.product.findMany({
    where: { ...LIVE, isFeatured: true },
    select: cardSelect,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map(toCard);
}

const ALL_PRODUCTS_PAGE_SIZE = 24;

export async function getAllProducts(opts: { sort?: string; page?: number } = {}) {
  const page = Math.max(1, Math.floor(opts.page ?? 1));
  const orderBy: Prisma.ProductOrderByWithRelationInput =
    opts.sort === "price-asc" ? { basePrice: "asc" } : opts.sort === "price-desc" ? { basePrice: "desc" } : { createdAt: "desc" };

  const [rows, total] = await Promise.all([
    db.product.findMany({
      where: LIVE,
      select: cardSelect,
      orderBy,
      skip: (page - 1) * ALL_PRODUCTS_PAGE_SIZE,
      take: ALL_PRODUCTS_PAGE_SIZE,
    }),
    db.product.count({ where: LIVE }),
  ]);
  return { products: rows.map(toCard), total, page, pageCount: Math.max(1, Math.ceil(total / ALL_PRODUCTS_PAGE_SIZE)) };
}

export async function getProductCardBySlug(slug: string): Promise<ProductCardData | null> {
  const row = await db.product.findFirst({ where: { ...LIVE, slug }, select: cardSelect });
  return row ? toCard(row) : null;
}

/** قائمة مختصرة بالمنتجات المنشورة — لقوائم الاختيار في لوحة التحكم. */
export async function getActiveProductOptions(): Promise<{ slug: string; nameAr: string }[]> {
  return db.product.findMany({
    where: LIVE,
    select: { slug: true, nameAr: true },
    orderBy: { nameAr: "asc" },
  });
}

export async function getNewArrivals(limit = 8): Promise<ProductCardData[]> {
  const rows = await db.product.findMany({
    where: LIVE,
    select: cardSelect,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map(toCard);
}

export async function getProductsByCategory(
  slug: string,
  opts: { sort?: string } = {},
): Promise<{ category: { nameAr: string; descAr: string | null } | null; products: ProductCardData[] }> {
  const category = await db.category.findUnique({
    where: { slug },
    select: { id: true, nameAr: true, descAr: true },
  });
  if (!category) return { category: null, products: [] };

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    opts.sort === "price-asc" ? { basePrice: "asc" }
    : opts.sort === "price-desc" ? { basePrice: "desc" }
    : { createdAt: "desc" };

  const rows = await db.product.findMany({
    where: { ...LIVE, categoryId: category.id },
    select: cardSelect,
    orderBy,
  });

  return { category: { nameAr: category.nameAr, descAr: category.descAr }, products: rows.map(toCard) };
}

/** بحث بالاسم أو الوصف المختصر — غير حسّاس لحالة الأحرف، يكفي لحجم كتالوج متجر واحد. */
export async function searchProducts(query: string, limit = 24): Promise<ProductCardData[]> {
  const q = query.trim();
  if (!q) return [];

  const rows = await db.product.findMany({
    where: {
      ...LIVE,
      OR: [
        { nameAr: { contains: q, mode: "insensitive" } },
        { shortDescAr: { contains: q, mode: "insensitive" } },
      ],
    },
    select: cardSelect,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map(toCard);
}

export async function getProductBySlug(slug: string) {
  const p = await db.product.findFirst({
    where: { slug, ...LIVE },
    include: {
      images: { orderBy: { position: "asc" } },
      variants: { where: { isActive: true }, include: { inventory: true }, orderBy: { price: "asc" } },
      category: { select: { slug: true, nameAr: true } },
      reviews: { where: { isApproved: true }, orderBy: { createdAt: "desc" }, take: 5 },
    },
  });
  if (!p) return null;

  const ratings = p.reviews.map((r) => r.rating);
  return {
    ...p,
    basePrice: Number(p.basePrice),
    comparePrice: p.comparePrice == null ? null : Number(p.comparePrice),
    variants: p.variants.map((v) => ({
      ...v,
      price: Number(v.price),
      comparePrice: v.comparePrice == null ? null : Number(v.comparePrice),
      options: v.options as Record<string, string>,
      available: Math.max(0, (v.inventory?.onHand ?? 0) - (v.inventory?.reserved ?? 0)),
    })),
    rating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0,
    reviewCount: ratings.length,
  };
}

export async function getRelatedProducts(categoryId: string | null, excludeSlug: string, limit = 4) {
  if (!categoryId) return [];
  const rows = await db.product.findMany({
    where: { ...LIVE, categoryId, slug: { not: excludeSlug } },
    select: cardSelect,
    take: limit,
  });
  return rows.map(toCard);
}

export async function getCategories() {
  return db.category.findMany({
    where: { isActive: true, parentId: null },
    orderBy: { position: "asc" },
    select: {
      slug: true,
      nameAr: true,
      descAr: true,
      _count: { select: { products: { where: LIVE } } },
    },
  });
}

export async function getActiveProductCount() {
  return db.product.count({ where: LIVE });
}

/** يبحث عن منتج مناسب لقسم "بندل العرض" — أي منتج نشط عليه تخفيض حالياً. */
export async function getPromoProduct() {
  const candidate = await db.product.findFirst({
    where: { ...LIVE, comparePrice: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { slug: true },
  });
  return candidate ? getProductBySlug(candidate.slug) : null;
}

export async function getTestimonials(limit = 3) {
  const reviews = await db.review.findMany({
    where: { isApproved: true, rating: { gte: 4 }, comment: { not: null } },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { product: { select: { nameAr: true } } },
  });
  return reviews.map((r) => ({
    id: r.id,
    authorName: r.authorName,
    rating: r.rating,
    comment: r.comment!,
    productName: r.product.nameAr,
  }));
}
