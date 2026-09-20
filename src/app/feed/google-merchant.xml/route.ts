import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { CURRENCY, SITE_URL } from "@/lib/constants";
import { getStoreInfoSettings } from "@/server/settings";

/**
 * تغذية منتجات لـ Google Merchant Center (صيغة RSS 2.0 + مساحة أسماء g:) —
 * تُسجَّل في Merchant Center لإظهار المنتجات في Google Shopping وإعلاناته.
 * تبقى عامة (بلا مصادقة) عمداً — روبوت قوقل يجلبها دون تسجيل دخول، تماماً
 * كسايت ماب.xml وروبوتس.txt.
 */
export const dynamic = "force-dynamic";

function escapeXml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const [products, storeInfo] = await Promise.all([
    db.product.findMany({
      where: { status: "ACTIVE", deletedAt: null },
      include: {
        images: { orderBy: { position: "asc" }, take: 1 },
        variants: { where: { isActive: true }, include: { inventory: true }, orderBy: { price: "asc" }, take: 1 },
        category: { select: { nameAr: true } },
      },
    }),
    getStoreInfoSettings(),
  ]);

  const items = products
    .filter((p) => p.variants.length > 0 && p.images.length > 0)
    .map((p) => {
      const variant = p.variants[0];
      const available = Math.max(0, (variant.inventory?.onHand ?? 0) - (variant.inventory?.reserved ?? 0));
      const price = Number(variant.price);
      const link = `${SITE_URL}/p/${p.slug}`;
      const imageLink = `${SITE_URL}${p.images[0].url}`;
      const description = p.shortDescAr ?? p.descAr ?? p.nameAr;

      return `
    <item>
      <g:id>${escapeXml(variant.sku)}</g:id>
      <title>${escapeXml(p.nameAr)}</title>
      <description>${escapeXml(description)}</description>
      <link>${escapeXml(link)}</link>
      <g:image_link>${escapeXml(imageLink)}</g:image_link>
      <g:availability>${available > 0 ? "in_stock" : "out_of_stock"}</g:availability>
      <g:price>${price.toFixed(2)} ${CURRENCY}</g:price>
      <g:condition>new</g:condition>
      <g:brand>${escapeXml(storeInfo.name)}</g:brand>${
        p.category ? `\n      <g:product_type>${escapeXml(p.category.nameAr)}</g:product_type>` : ""
      }
    </item>`;
    })
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${escapeXml(storeInfo.name)}</title>
    <link>${escapeXml(SITE_URL)}</link>
    <description>${escapeXml(storeInfo.tagline || storeInfo.name)}</description>${items}
  </channel>
</rss>
`;

  return new NextResponse(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
