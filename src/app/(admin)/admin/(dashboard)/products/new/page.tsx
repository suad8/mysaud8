import { Topbar } from "@/components/admin/Topbar";
import { ProductForm } from "@/components/admin/ProductForm";
import { createProductAction } from "@/server/products/actions";
import { db } from "@/server/db";

export default async function NewProductPage() {
  const categories = await db.category.findMany({
    where: { isActive: true },
    orderBy: { position: "asc" },
    select: { id: true, nameAr: true },
  });

  return (
    <>
      <Topbar title="منتج جديد" subtitle="أضف منتجاً جديداً لكتالوج متجرك" />
      <div className="p-5 lg:p-8">
        <ProductForm mode="create" action={createProductAction} categories={categories} />
      </div>
    </>
  );
}
