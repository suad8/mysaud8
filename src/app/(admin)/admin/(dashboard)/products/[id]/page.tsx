import { notFound } from "next/navigation";
import Link from "next/link";
import { Topbar } from "@/components/admin/Topbar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ProductForm, type ProductFormInitial } from "@/components/admin/ProductForm";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { db } from "@/server/db";
import {
  updateProductAction,
  archiveProductAction,
  publishProductAction,
  softDeleteProductAction,
} from "@/server/products/actions";
import { PRODUCT_STATUS } from "@/lib/constants";
import { parseCustomFieldDefs } from "@/server/products/custom-fields";

type Props = { params: Promise<{ id: string }> };

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    db.product.findUnique({
      where: { id, deletedAt: null },
      include: { images: { orderBy: { position: "asc" } }, variants: { include: { inventory: true } } },
    }),
    db.category.findMany({ where: { isActive: true }, orderBy: { position: "asc" }, select: { id: true, nameAr: true } }),
  ]);
  if (!product) notFound();

  const initial: ProductFormInitial = {
    nameAr: product.nameAr,
    shortDescAr: product.shortDescAr ?? "",
    descAr: product.descAr ?? "",
    categoryId: product.categoryId ?? "",
    status: product.status,
    isFeatured: product.isFeatured,
    basePrice: product.basePrice.toString(),
    comparePrice: product.comparePrice?.toString() ?? "",
    costPrice: product.costPrice?.toString() ?? "",
    images: product.images.map((i) => ({ id: i.id, url: i.url, alt: i.alt })),
    variants: product.variants.map((v) => ({
      id: v.id,
      nameAr: v.nameAr,
      sku: v.sku,
      price: v.price.toString(),
      stock: v.inventory?.onHand ?? 0,
    })),
    customFields: parseCustomFieldDefs(product.customFields),
  };

  const meta = PRODUCT_STATUS[product.status];
  const boundUpdate = updateProductAction.bind(null, product.id);

  return (
    <>
      <Topbar
        title={product.nameAr}
        subtitle="تعديل بيانات المنتج"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={meta.tone}>{meta.label}</Badge>
            <Link href={`/p/${product.slug}`} target="_blank" className="text-xs font-medium text-brand-700 hover:underline">
              عرض في المتجر ↗
            </Link>
          </div>
        }
      />

      <div className="space-y-4 p-5 lg:p-8">
        <div className="flex flex-wrap gap-2">
          {product.status !== "ACTIVE" && (
            <form action={publishProductAction.bind(null, product.id)}>
              <Button size="sm">نشر المنتج</Button>
            </form>
          )}
          {product.status !== "ARCHIVED" && (
            <form action={archiveProductAction.bind(null, product.id)}>
              <Button variant="secondary" size="sm">أرشفة</Button>
            </form>
          )}
          <form action={softDeleteProductAction.bind(null, product.id)}>
            <ConfirmSubmitButton
              type="submit"
              variant="danger"
              size="sm"
              confirmMessage={`هل أنت متأكد من حذف "${product.nameAr}"؟ سيختفي من المتجر ولوحة التحكم، لكن طلباته السابقة تبقى محفوظة.`}
            >
              حذف
            </ConfirmSubmitButton>
          </form>
        </div>

        <ProductForm mode="edit" action={boundUpdate} categories={categories} initial={initial} />
      </div>
    </>
  );
}
