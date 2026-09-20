"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { saveUploadedFile, UploadError } from "@/lib/uploads";
import { ProductStatus } from "@prisma/client";

export type ProductFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** يحوّل الاسم العربي/اللاتيني إلى رابط صالح — يحافظ على الحروف والأرقام فقط. */
function slugify(input: string): string {
  const base = input
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return base || `product-${Date.now()}`;
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base;
  let i = 1;
  // نطاق تكرار صغير متوقّع لكتالوج متجر واحد — يكفي فحص تسلسلي بسيط
  while (await db.product.findUnique({ where: { slug }, select: { id: true } })) {
    i += 1;
    slug = `${base}-${i}`;
  }
  return slug;
}

function parseProductFields(formData: FormData) {
  const fieldErrors: Record<string, string> = {};

  const nameAr = String(formData.get("nameAr") ?? "").trim();
  if (!nameAr) fieldErrors.nameAr = "اسم المنتج مطلوب";

  const basePriceRaw = String(formData.get("basePrice") ?? "").trim();
  const basePrice = Number(basePriceRaw);
  if (!basePriceRaw || Number.isNaN(basePrice) || basePrice <= 0) {
    fieldErrors.basePrice = "السعر مطلوب ويجب أن يكون أكبر من صفر";
  }

  const comparePriceRaw = String(formData.get("comparePrice") ?? "").trim();
  const comparePrice = comparePriceRaw ? Number(comparePriceRaw) : null;
  if (comparePriceRaw && Number.isNaN(comparePrice as number)) {
    fieldErrors.comparePrice = "قيمة غير صالحة";
  } else if (comparePrice != null && !Number.isNaN(basePrice) && comparePrice <= basePrice) {
    fieldErrors.comparePrice = "يجب أن يكون أكبر من السعر الأساسي";
  }

  const costPriceRaw = String(formData.get("costPrice") ?? "").trim();
  const costPrice = costPriceRaw ? Number(costPriceRaw) : null;
  if (costPriceRaw && Number.isNaN(costPrice as number)) fieldErrors.costPrice = "قيمة غير صالحة";

  const stockRaw = String(formData.get("stock") ?? "").trim();
  const stock = stockRaw ? Math.round(Number(stockRaw)) : 0;
  if (stockRaw && (Number.isNaN(stock) || stock < 0)) fieldErrors.stock = "الكمية يجب أن تكون رقماً صحيحاً موجباً";

  return {
    fieldErrors,
    nameAr,
    shortDescAr: String(formData.get("shortDescAr") ?? "").trim() || null,
    descAr: String(formData.get("descAr") ?? "").trim() || null,
    categoryId: String(formData.get("categoryId") ?? "").trim() || null,
    status: String(formData.get("status") ?? "DRAFT") as ProductStatus,
    isFeatured: formData.get("isFeatured") === "on",
    basePrice: round2(basePrice),
    comparePrice: comparePrice != null ? round2(comparePrice) : null,
    costPrice: costPrice != null ? round2(costPrice) : null,
    stock,
  };
}

export async function createProductAction(
  _prevState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const parsed = parseProductFields(formData);
  if (Object.keys(parsed.fieldErrors).length > 0) return { fieldErrors: parsed.fieldErrors };

  let imageUrl: string | null = null;
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    try {
      imageUrl = await saveUploadedFile(file, "products");
    } catch (e) {
      return { fieldErrors: { image: e instanceof UploadError ? e.message : "تعذّر رفع الصورة" } };
    }
  }

  const slug = await uniqueSlug(slugify(parsed.nameAr));
  const sku = `${slug.toUpperCase().slice(0, 12)}-${Date.now().toString().slice(-4)}`;

  let productId: string;
  try {
    const product = await db.product.create({
      data: {
        slug,
        nameAr: parsed.nameAr,
        shortDescAr: parsed.shortDescAr,
        descAr: parsed.descAr,
        categoryId: parsed.categoryId,
        status: parsed.status,
        isFeatured: parsed.isFeatured,
        basePrice: parsed.basePrice,
        comparePrice: parsed.comparePrice,
        costPrice: parsed.costPrice,
        metaTitle: parsed.nameAr,
        metaDesc: parsed.shortDescAr,
        images: imageUrl ? { create: [{ url: imageUrl, alt: parsed.nameAr, position: 0 }] } : undefined,
        variants: {
          create: [
            {
              sku,
              nameAr: "الافتراضي",
              options: {},
              price: parsed.basePrice,
              comparePrice: parsed.comparePrice,
              inventory: { create: { onHand: parsed.stock, reserved: 0, lowStockAt: 5 } },
            },
          ],
        },
      },
      select: { id: true },
    });
    productId = product.id;
  } catch {
    return { error: "حدث خطأ أثناء إنشاء المنتج، يرجى المحاولة مرة أخرى." };
  }

  revalidatePath("/admin/products");
  revalidatePath("/admin/inventory");
  revalidatePath("/");
  redirect(`/admin/products/${productId}`);
}

export async function updateProductAction(
  productId: string,
  _prevState: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  const parsed = parseProductFields(formData);
  if (Object.keys(parsed.fieldErrors).length > 0) return { fieldErrors: parsed.fieldErrors };

  let newImageUrl: string | null = null;
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    try {
      newImageUrl = await saveUploadedFile(file, "products");
    } catch (e) {
      return { fieldErrors: { image: e instanceof UploadError ? e.message : "تعذّر رفع الصورة" } };
    }
  }

  try {
    await db.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: productId },
        data: {
          nameAr: parsed.nameAr,
          shortDescAr: parsed.shortDescAr,
          descAr: parsed.descAr,
          categoryId: parsed.categoryId,
          status: parsed.status,
          isFeatured: parsed.isFeatured,
          basePrice: parsed.basePrice,
          comparePrice: parsed.comparePrice,
          costPrice: parsed.costPrice,
        },
      });

      if (newImageUrl) {
        const maxPos = await tx.productImage.count({ where: { productId } });
        await tx.productImage.create({ data: { productId, url: newImageUrl, alt: parsed.nameAr, position: maxPos } });
      }

      const variants = await tx.productVariant.findMany({ where: { productId }, select: { id: true } });

      if (variants.length === 1) {
        // منتج بمتغيّر واحد: سعره ومخزونه هما نفس حقلي "التسعير"/"المخزون"
        // بالنموذج مباشرة — لا يوجد جدول متغيّرات منفصل يُقرأ منه هنا.
        await tx.productVariant.update({
          where: { id: variants[0].id },
          data: { price: parsed.basePrice, comparePrice: parsed.comparePrice },
        });
        await tx.inventoryItem.update({ where: { variantId: variants[0].id }, data: { onHand: parsed.stock } });
      } else {
        // عدّة متغيّرات: كل صف بجدول المتغيّرات يرسل سعره ومخزونه الخاص
        for (const { id: vId } of variants) {
          const priceRaw = formData.get(`variantPrice_${vId}`);
          const stockRaw = formData.get(`variantStock_${vId}`);
          const price = priceRaw != null && priceRaw !== "" ? Number(priceRaw) : null;
          const stock = stockRaw != null && stockRaw !== "" ? Math.round(Number(stockRaw)) : null;

          if (price != null && !Number.isNaN(price) && price > 0) {
            await tx.productVariant.update({ where: { id: vId }, data: { price: round2(price) } });
          }
          if (stock != null && !Number.isNaN(stock) && stock >= 0) {
            await tx.inventoryItem.update({ where: { variantId: vId }, data: { onHand: stock } });
          }
        }
      }
    });
  } catch {
    return { error: "حدث خطأ أثناء حفظ التغييرات، يرجى المحاولة مرة أخرى." };
  }

  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/admin/products");
  revalidatePath("/admin/inventory");
  revalidatePath("/");
  return {};
}

/** أرشفة: يخفي المنتج من المتجر دون حذف سجلاته (الطلبات القديمة تبقى صالحة). */
export async function archiveProductAction(productId: string, _formData: FormData) {
  await db.product.update({ where: { id: productId }, data: { status: "ARCHIVED" } });
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/");
}

export async function publishProductAction(productId: string, _formData: FormData) {
  await db.product.update({ where: { id: productId }, data: { status: "ACTIVE" } });
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/");
}

/** حذف ناعم: يُخفى المنتج من كل مكان لكن سجلات الطلبات القديمة تبقى سليمة. */
export async function softDeleteProductAction(productId: string, _formData: FormData) {
  await db.product.update({ where: { id: productId }, data: { deletedAt: new Date(), status: "ARCHIVED" } });
  revalidatePath("/admin/products");
  revalidatePath("/");
  redirect("/admin/products");
}
