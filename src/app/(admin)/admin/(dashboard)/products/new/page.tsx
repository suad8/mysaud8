import { Topbar } from "@/components/admin/Topbar";
import { isAiImageConfigured } from "@/server/ai/gemini";
import { ProductForm } from "@/components/admin/ProductForm";
import { createProductAction } from "@/server/products/actions";
import { db } from "@/server/db";
import { requireAdminPage } from "@/server/auth/session";

export default async function NewProductPage() {
  await requireAdminPage();
  const categories = await db.category.findMany({
    where: { isActive: true },
    orderBy: { position: "asc" },
    select: { id: true, nameAr: true },
  });

  return (
    <>
      <Topbar title="منتج جديد" subtitle="أضف منتجاً جديداً لكتالوج متجرك" />
      <div className="p-5 lg:p-8">
        <ProductForm aiEnabled={isAiImageConfigured()} mode="create" action={createProductAction} categories={categories} />
      </div>
    </>
  );
}
