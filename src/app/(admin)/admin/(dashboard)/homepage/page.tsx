import { Topbar } from "@/components/admin/Topbar";
import { HeroBannerForm } from "@/components/admin/HeroBannerForm";
import { HomeBuilder } from "@/components/admin/HomeBuilder";
import { db } from "@/server/db";
import { getHeroContent, getHomeBlocks, getThemeSettings } from "@/server/settings";
import { getLinkOptions } from "@/server/settings/link-options";
import { requireAdminPage } from "@/server/auth/session";

export default async function AdminHomepagePage() {
  await requireAdminPage();
  const [blocks, hero, theme, products, categories, linkOptions] = await Promise.all([
    getHomeBlocks(),
    getHeroContent(),
    getThemeSettings(),
    db.product
      .findMany({
        where: { status: "ACTIVE", deletedAt: null },
        select: { id: true, slug: true, nameAr: true, isFeatured: true, basePrice: true, images: { select: { url: true }, orderBy: { position: "asc" }, take: 1 } },
        orderBy: { nameAr: "asc" },
      })
      .then((rows) => rows.map(({ images, basePrice, ...p }) => ({ ...p, imageUrl: images[0]?.url ?? null, price: Number(basePrice) }))),
    db.category.findMany({ where: { isActive: true }, select: { slug: true, nameAr: true }, orderBy: { position: "asc" } }),
    getLinkOptions({ withProducts: true }),
  ]);

  return (
    <>
      <Topbar title="تصميم الرئيسية" subtitle="أضف أقسام الصفحة الرئيسية واحذفها ورتّبها كما تريد" />
      <div className="p-5 pb-28 lg:p-8 lg:pb-28">
        <HomeBuilder
          initialBlocks={blocks}
          products={products}
          categories={categories}
          featuredOrder={theme.featuredOrder}
          linkOptions={linkOptions}
          heroEditor={<HeroBannerForm hero={hero} products={products.map((p) => ({ slug: p.slug, nameAr: p.nameAr }))} />}
        />
      </div>
    </>
  );
}
