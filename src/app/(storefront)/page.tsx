import { HomeBlockView } from "@/components/storefront/home/HomeBlocks";
import { getHomeBlocks, getStoreInfoSettings, getThemeSettings } from "@/server/settings";
import { toJsonLd } from "@/lib/json-ld";
import { SITE_URL } from "@/lib/constants";

/** الصفحة الرئيسية = أقسام «تصميم الرئيسية» بالترتيب الذي اختاره المدير (المخفية لا تُعرض). */
export default async function HomePage() {
  const [blocks, theme, storeInfo] = await Promise.all([getHomeBlocks(), getThemeSettings(), getStoreInfoSettings()]);

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: storeInfo.name,
    description: storeInfo.tagline || undefined,
    url: SITE_URL,
    logo: storeInfo.logoUrl ? `${SITE_URL}${storeInfo.logoUrl}` : undefined,
  };

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: storeInfo.name,
    url: SITE_URL,
  };

  const visible = blocks.filter((b) => b.visible);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLd(organizationJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toJsonLd(websiteJsonLd) }} />

      {visible.map((block, i) => (
        <HomeBlockView key={block.id} block={block} ctx={{ featuredOrder: theme.featuredOrder, first: i === 0 }} />
      ))}
    </>
  );
}
