"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { saveUploadedFile, UploadError } from "@/lib/uploads";
import { requireAdmin } from "@/server/auth/session";
import { logAudit } from "@/server/audit/log";
import { ProductStatus } from "@prisma/client";
import type { CustomFieldDef, CustomFieldType } from "@/server/products/custom-fields";

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

type VariantInput = { id: string | null; nameAr: string; price: number; stock: number };

/** يقرأ صفوف الخيارات المتعددة من الحقول المتكررة الاسم (formData.getAll) ويتحقق من صحتها. */
function parseVariantRows(formData: FormData): { error: string } | { rows: VariantInput[] } {
  const ids = formData.getAll("variantId").map((v) => String(v));
  const names = formData.getAll("variantName").map((v) => String(v).trim());
  const prices = formData.getAll("variantPrice").map((v) => String(v).trim());
  const stocks = formData.getAll("variantStock").map((v) => String(v).trim());

  if (names.length === 0) return { error: "أضف خياراً واحداً على الأقل للمنتج" };

  const rows: VariantInput[] = [];
  const seenNames = new Set<string>();
  for (let i = 0; i < names.length; i++) {
    const nameAr = names[i];
    if (!nameAr) return { error: "اسم كل خيار مطلوب" };

    const normalized = nameAr.toLowerCase();
    if (seenNames.has(normalized)) return { error: `يوجد خيار مكرر بالاسم "${nameAr}"` };
    seenNames.add(normalized);

    const price = Number(prices[i]);
    if (!prices[i] || Number.isNaN(price) || price <= 0) {
      return { error: `سعر الخيار "${nameAr}" يجب أن يكون رقماً أكبر من صفر` };
    }

    const stock = Math.round(Number(stocks[i]));
    if (stocks[i] === "" || Number.isNaN(stock) || stock < 0) {
      return { error: `مخزون الخيار "${nameAr}" غير صالح` };
    }

    rows.push({ id: ids[i] || null, nameAr, price: round2(price), stock });
  }
  return { rows };
}

const CUSTOM_FIELD_TYPES: CustomFieldType[] = ["TEXT", "TEXTAREA", "FILE"];

/** يقرأ الحقول المخصّصة (نص/ملف) من الحقول المتكررة الاسم ويتحقق من صحتها. */
function parseCustomFields(formData: FormData): { error: string } | { fields: CustomFieldDef[] } {
  const ids = formData.getAll("customFieldId").map((v) => String(v));
  const labels = formData.getAll("customFieldLabel").map((v) => String(v).trim());
  const types = formData.getAll("customFieldType").map((v) => String(v));
  const requiredFlags = formData.getAll("customFieldRequired").map((v) => v === "on");

  const fields: CustomFieldDef[] = [];
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];
    if (!label) return { error: "عنوان كل حقل مخصّص مطلوب" };
    const type = types[i];
    if (!CUSTOM_FIELD_TYPES.includes(type as CustomFieldType)) return { error: "نوع حقل مخصّص غير صالح" };
    fields.push({ id: ids[i] || `cf-${Date.now()}-${i}`, label, type: type as CustomFieldType, required: requiredFlags[i] ?? false });
  }
  return { fields };
}

/** SKU عشوائي مقروء لخيار جديد — يكفي احتمال التصادم الضئيل جداً نطاق كتالوج متجر واحد. */
function variantSku(base: string, index: number): string {
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${base}-${index + 1}-${Date.now().toString().slice(-5)}${rand}`;
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
  const session = await requireAdmin();

  const parsed = parseProductFields(formData);
  if (Object.keys(parsed.fieldErrors).length > 0) return { fieldErrors: parsed.fieldErrors };

  const multiOption = formData.get("multiOption") === "on";
  let variantRows: VariantInput[] = [];
  if (multiOption) {
    const result = parseVariantRows(formData);
    if ("error" in result) return { error: result.error };
    variantRows = result.rows;
  }

  const customFieldsResult = parseCustomFields(formData);
  if ("error" in customFieldsResult) return { error: customFieldsResult.error };
  const customFields = customFieldsResult.fields;

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
  const skuBase = slug.toUpperCase().slice(0, 10);

  const variantsCreate = multiOption
    ? variantRows.map((row, i) => ({
        sku: variantSku(skuBase, i),
        nameAr: row.nameAr,
        options: {},
        price: row.price,
        comparePrice: parsed.comparePrice,
        inventory: { create: { onHand: row.stock, reserved: 0, lowStockAt: 5 } },
      }))
    : [
        {
          sku: variantSku(skuBase, 0),
          nameAr: "الافتراضي",
          options: {},
          price: parsed.basePrice,
          comparePrice: parsed.comparePrice,
          inventory: { create: { onHand: parsed.stock, reserved: 0, lowStockAt: 5 } },
        },
      ];

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
        customFields,
        images: imageUrl ? { create: [{ url: imageUrl, alt: parsed.nameAr, position: 0 }] } : undefined,
        variants: { create: variantsCreate },
      },
      select: { id: true },
    });
    productId = product.id;
  } catch {
    return { error: "حدث خطأ أثناء إنشاء المنتج، يرجى المحاولة مرة أخرى." };
  }

  await logAudit({
    actorId: session.sub,
    action: "product.created",
    entity: "Product",
    entityId: productId,
    diff: { nameAr: parsed.nameAr, variantCount: variantsCreate.length },
  });

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
  const session = await requireAdmin();

  const parsed = parseProductFields(formData);
  if (Object.keys(parsed.fieldErrors).length > 0) return { fieldErrors: parsed.fieldErrors };

  const multiOption = formData.get("multiOption") === "on";
  let variantRows: VariantInput[] = [];
  const removeIds = formData.getAll("removeVariantId").map((v) => String(v)).filter(Boolean);
  if (multiOption) {
    const result = parseVariantRows(formData);
    if ("error" in result) return { error: result.error };
    variantRows = result.rows;
  }

  const customFieldsResult = parseCustomFields(formData);
  if ("error" in customFieldsResult) return { error: customFieldsResult.error };
  const customFields = customFieldsResult.fields;

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
          customFields,
        },
      });

      if (newImageUrl) {
        const maxPos = await tx.productImage.count({ where: { productId } });
        await tx.productImage.create({ data: { productId, url: newImageUrl, alt: parsed.nameAr, position: maxPos } });
      }

      if (multiOption) {
        // الصفوف المُرسلة تمثل مجموعة الخيارات النهائية المطلوبة؛ الحذف يُطبَّق
        // فقط على الخيارات القديمة غير الموجودة ضمنها (احتياط دفاعي إضافي).
        const keepIds = new Set(variantRows.map((r) => r.id).filter((id): id is string => Boolean(id)));
        const finalRemoveIds = removeIds.filter((id) => !keepIds.has(id));

        if (finalRemoveIds.length > 0) {
          // سلال العملاء تشير لهذه الخيارات بقيد FK إلزامي؛ يجب تفريغها أولاً
          await tx.cartItem.deleteMany({ where: { variantId: { in: finalRemoveIds } } });
          await tx.productVariant.deleteMany({ where: { id: { in: finalRemoveIds }, productId } });
        }

        const skuBase = productId.toUpperCase().slice(0, 10);
        let newIndex = 0;
        for (const row of variantRows) {
          if (row.id) {
            await tx.productVariant.update({
              where: { id: row.id },
              data: { nameAr: row.nameAr, price: row.price, comparePrice: parsed.comparePrice },
            });
            await tx.inventoryItem.update({ where: { variantId: row.id }, data: { onHand: row.stock } });
          } else {
            await tx.productVariant.create({
              data: {
                productId,
                sku: variantSku(skuBase, newIndex),
                nameAr: row.nameAr,
                options: {},
                price: row.price,
                comparePrice: parsed.comparePrice,
                inventory: { create: { onHand: row.stock, reserved: 0, lowStockAt: 5 } },
              },
            });
            newIndex += 1;
          }
        }
      } else {
        // منتج بمتغيّر واحد: سعره ومخزونه هما نفس حقلي "التسعير"/"المخزون" بالنموذج مباشرة.
        // إن كان للمنتج عدّة متغيّرات وتم إلغاء تفعيل "خيارات متعددة" دون تعديلها،
        // نتركها كما هي تفادياً لحذف بيانات دون طلب صريح من المدير.
        const variants = await tx.productVariant.findMany({ where: { productId }, select: { id: true } });
        if (variants.length === 1) {
          await tx.productVariant.update({
            where: { id: variants[0].id },
            data: { price: parsed.basePrice, comparePrice: parsed.comparePrice },
          });
          await tx.inventoryItem.update({ where: { variantId: variants[0].id }, data: { onHand: parsed.stock } });
        }
      }
    });
  } catch {
    return { error: "حدث خطأ أثناء حفظ التغييرات، يرجى المحاولة مرة أخرى." };
  }

  await logAudit({ actorId: session.sub, action: "product.updated", entity: "Product", entityId: productId });

  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/admin/products");
  revalidatePath("/admin/inventory");
  revalidatePath("/");
  return {};
}

/** أرشفة: يخفي المنتج من المتجر دون حذف سجلاته (الطلبات القديمة تبقى صالحة). */
export async function archiveProductAction(productId: string, _formData: FormData) {
  const session = await requireAdmin();
  await db.product.update({ where: { id: productId }, data: { status: "ARCHIVED" } });
  await logAudit({ actorId: session.sub, action: "product.archived", entity: "Product", entityId: productId });
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/");
}

export async function publishProductAction(productId: string, _formData: FormData) {
  const session = await requireAdmin();
  await db.product.update({ where: { id: productId }, data: { status: "ACTIVE" } });
  await logAudit({ actorId: session.sub, action: "product.published", entity: "Product", entityId: productId });
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/");
}

/** حذف ناعم: يُخفى المنتج من كل مكان لكن سجلات الطلبات القديمة تبقى سليمة. */
export async function softDeleteProductAction(productId: string, _formData: FormData) {
  const session = await requireAdmin();
  await db.product.update({ where: { id: productId }, data: { deletedAt: new Date(), status: "ARCHIVED" } });
  await logAudit({ actorId: session.sub, action: "product.deleted", entity: "Product", entityId: productId });
  revalidatePath("/admin/products");
  revalidatePath("/");
  redirect("/admin/products");
}
