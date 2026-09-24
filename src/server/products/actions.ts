"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { deleteUploadedFile, saveUploadedFile, UploadError } from "@/lib/uploads";
import { requireAdmin } from "@/server/auth/session";
import { logAudit } from "@/server/audit/log";
import { ProductStatus } from "@prisma/client";
import type { CustomFieldDef, CustomFieldType } from "@/server/products/custom-fields";
import { slugify, uniqueSlug } from "@/lib/slug";
import { PROMO_COLORS, PROMO_TITLE_MAX } from "@/lib/promo";
import {
  MAX_COMBINATIONS,
  isValidSelection,
  optionKey,
  optionLabel,
  sanitizeOptionGroups,
  type OptionGroup,
  type OptionSelection,
} from "@/lib/product-options";

export type ProductFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  /** وقت آخر حفظ ناجح — لإظهار تأكيد الحفظ في النموذج */
  savedAt?: number;
};

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

const productSlugExists = async (slug: string) => Boolean(await db.product.findUnique({ where: { slug }, select: { id: true } }));

type VariantInput = { id: string | null; nameAr: string; options: OptionSelection; price: number; stock: number };

/** مجموعات الخيارات المرسلة من محرّر الخيارات (JSON في حقل مخفي). */
function parseOptionGroups(formData: FormData): OptionGroup[] {
  try {
    return sanitizeOptionGroups(JSON.parse(String(formData.get("optionGroups") ?? "[]")));
  } catch {
    return [];
  }
}

/**
 * يقرأ صفوف التركيبات من الحقول المتكررة الاسم (formData.getAll) ويتحقق منها:
 * كل صف يحمل قيمة صالحة من كل مجموعة، بلا تكرار، وسعر ومخزون صالحان.
 * اسم المتغيّر يُبنى على الخادم من القيم (لا يُوثَق بالاسم المرسل).
 */
function parseVariantRows(formData: FormData, groups: OptionGroup[]): { error: string } | { rows: VariantInput[] } {
  if (groups.length === 0) return { error: "أضف مجموعة خيارات واحدة على الأقل (مثل: المقاس) مع قيمها" };
  const ids = formData.getAll("variantId").map((v) => String(v));
  const optionsRaw = formData.getAll("variantOptions").map((v) => String(v));
  const prices = formData.getAll("variantPrice").map((v) => String(v).trim());
  const stocks = formData.getAll("variantStock").map((v) => String(v).trim());

  if (optionsRaw.length === 0) return { error: "أضف قيمة واحدة على الأقل لكل مجموعة خيارات" };
  if (optionsRaw.length > MAX_COMBINATIONS) return { error: `عدد التركيبات أكبر من الحد (${MAX_COMBINATIONS}) — قلّل القيم` };

  const rows: VariantInput[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < optionsRaw.length; i++) {
    let options: unknown;
    try {
      options = JSON.parse(optionsRaw[i]!);
    } catch {
      return { error: "بيانات الخيارات غير صالحة — أعد تحميل الصفحة" };
    }
    if (!isValidSelection(groups, options)) return { error: "بيانات الخيارات غير صالحة — أعد تحميل الصفحة" };
    const key = optionKey(groups, options);
    if (seen.has(key)) return { error: "توجد تركيبة خيارات مكررة" };
    seen.add(key);
    const nameAr = optionLabel(groups, options);

    const price = Number(prices[i]);
    if (!prices[i] || Number.isNaN(price) || price <= 0) {
      return { error: `سعر الخيار "${nameAr}" يجب أن يكون رقماً أكبر من صفر` };
    }

    const stock = Math.round(Number(stocks[i]));
    if (stocks[i] === "" || Number.isNaN(stock) || stock < 0) {
      return { error: `مخزون الخيار "${nameAr}" غير صالح` };
    }

    rows.push({ id: ids[i] || null, nameAr, options, price: round2(price), stock });
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

/** صورة مولّدة بالذكاء الاصطناعي (مسار داخلي فقط) — تصبح الصورة الرئيسية للمنتج */
const AI_IMAGE_PATTERN = /^\/api\/uploads\/products\/\d+-[a-f0-9]{8}\.jpg$/;
function readAiImageUrl(formData: FormData): string | null {
  const url = String(formData.get("aiImageUrl") ?? "");
  return AI_IMAGE_PATTERN.test(url) ? url : null;
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

  const statusRaw = String(formData.get("status") ?? "DRAFT");
  const status: ProductStatus = statusRaw === "ACTIVE" || statusRaw === "ARCHIVED" ? statusRaw : "DRAFT";
  const promoTitle = String(formData.get("promoTitle") ?? "").trim().slice(0, PROMO_TITLE_MAX) || null;
  const promoColorRaw = String(formData.get("promoColor") ?? "");
  const promoColor = promoColorRaw in PROMO_COLORS ? promoColorRaw : "brand";

  return {
    fieldErrors,
    nameAr,
    promoTitle,
    promoColor: promoTitle ? promoColor : null,
    shortDescAr: String(formData.get("shortDescAr") ?? "").trim() || null,
    descAr: String(formData.get("descAr") ?? "").trim() || null,
    categoryId: String(formData.get("categoryId") ?? "").trim() || null,
    status,
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
  const optionGroups = multiOption ? parseOptionGroups(formData) : [];
  let variantRows: VariantInput[] = [];
  if (multiOption) {
    const result = parseVariantRows(formData, optionGroups);
    if ("error" in result) return { error: result.error };
    variantRows = result.rows;
  }

  const customFieldsResult = parseCustomFields(formData);
  if ("error" in customFieldsResult) return { error: customFieldsResult.error };
  const customFields = customFieldsResult.fields;

  const aiImageUrl = readAiImageUrl(formData);
  let imageUrl: string | null = null;
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    try {
      imageUrl = await saveUploadedFile(file, "products");
    } catch (e) {
      return { fieldErrors: { image: e instanceof UploadError ? e.message : "تعذّر رفع الصورة" } };
    }
  }

  const slug = await uniqueSlug(slugify(parsed.nameAr, "product"), productSlugExists);
  const skuBase = slug.toUpperCase().slice(0, 10);

  const variantsCreate = multiOption
    ? variantRows.map((row, i) => ({
        sku: variantSku(skuBase, i),
        nameAr: row.nameAr,
        options: row.options,
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
        promoTitle: parsed.promoTitle,
        promoColor: parsed.promoColor,
        basePrice: parsed.basePrice,
        comparePrice: parsed.comparePrice,
        costPrice: parsed.costPrice,
        metaTitle: parsed.nameAr,
        metaDesc: parsed.shortDescAr,
        customFields,
        optionGroups,
        images: {
          create: [aiImageUrl, imageUrl]
            .filter((url): url is string => Boolean(url))
            .map((url, position) => ({ url, alt: parsed.nameAr, position })),
        },
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
  const optionGroups = multiOption ? parseOptionGroups(formData) : [];
  let variantRows: VariantInput[] = [];
  const removeIds = formData.getAll("removeVariantId").map((v) => String(v)).filter(Boolean);
  if (multiOption) {
    const result = parseVariantRows(formData, optionGroups);
    if ("error" in result) return { error: result.error };
    variantRows = result.rows;
  }

  const customFieldsResult = parseCustomFields(formData);
  if ("error" in customFieldsResult) return { error: customFieldsResult.error };
  const customFields = customFieldsResult.fields;

  const aiImageUrl = readAiImageUrl(formData);
  const removeImageIds = formData.getAll("removeImageId").map(String).filter(Boolean);
  let removedImageUrls: string[] = [];
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
          promoTitle: parsed.promoTitle,
          promoColor: parsed.promoColor,
          basePrice: parsed.basePrice,
          comparePrice: parsed.comparePrice,
          costPrice: parsed.costPrice,
          customFields,
          ...(multiOption ? { optionGroups } : {}),
        },
      });

      if (removeImageIds.length > 0) {
        const toRemove = await tx.productImage.findMany({ where: { productId, id: { in: removeImageIds } }, select: { url: true } });
        await tx.productImage.deleteMany({ where: { productId, id: { in: removeImageIds } } });
        removedImageUrls = toRemove.map((i) => i.url);
      }

      if (aiImageUrl) {
        // الصورة المولّدة تتصدّر (الصورة الرئيسية) وتُزاح البقية خطوة
        await tx.productImage.updateMany({ where: { productId }, data: { position: { increment: 1 } } });
        await tx.productImage.create({ data: { productId, url: aiImageUrl, alt: parsed.nameAr, position: 0 } });
      }

      if (newImageUrl) {
        const last = await tx.productImage.aggregate({ where: { productId }, _max: { position: true } });
        await tx.productImage.create({ data: { productId, url: newImageUrl, alt: parsed.nameAr, position: (last._max.position ?? -1) + 1 } });
      }

      if (multiOption) {
        // الصفوف المُرسلة تمثل مجموعة الخيارات النهائية المطلوبة؛ الحذف يُطبَّق
        // فقط على الخيارات القديمة غير الموجودة ضمنها (احتياط دفاعي إضافي).
        const keepIds = new Set(variantRows.map((r) => r.id).filter((id): id is string => Boolean(id)));
        const finalRemoveIds = removeIds.filter((id) => !keepIds.has(id));

        if (finalRemoveIds.length > 0) {
          // سلال العملاء تشير لهذه الخيارات بقيد FK إلزامي؛ يجب تفريغها أولاً
          await tx.cartItem.deleteMany({ where: { variantId: { in: finalRemoveIds } } });
          // خيار سبق طلبه يُخفى بدل حذفه — فواتير الطلبات القديمة تبقى سليمة
          const ordered = new Set(
            (await tx.orderItem.findMany({ where: { variantId: { in: finalRemoveIds } }, select: { variantId: true }, distinct: ["variantId"] }))
              .map((o) => o.variantId)
              .filter((id): id is string => Boolean(id)),
          );
          await tx.productVariant.updateMany({ where: { id: { in: [...ordered] }, productId }, data: { isActive: false } });
          await tx.productVariant.deleteMany({ where: { id: { in: finalRemoveIds.filter((id) => !ordered.has(id)) }, productId } });
        }

        const skuBase = productId.toUpperCase().slice(0, 10);
        let newIndex = 0;
        for (const row of variantRows) {
          if (row.id) {
            await tx.productVariant.update({
              where: { id: row.id, productId },
              data: { nameAr: row.nameAr, options: row.options, price: row.price, comparePrice: parsed.comparePrice, isActive: true },
            });
            await tx.inventoryItem.update({ where: { variantId: row.id }, data: { onHand: row.stock } });
          } else {
            await tx.productVariant.create({
              data: {
                productId,
                sku: variantSku(skuBase, newIndex),
                nameAr: row.nameAr,
                options: row.options,
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
        const variants = await tx.productVariant.findMany({ where: { productId, isActive: true }, select: { id: true } });
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

  // ملفات الصور المحذوفة من مجلد الرفع (الصور الثابتة داخل public/products تبقى)
  await Promise.all(removedImageUrls.map(deleteUploadedFile));
  await logAudit({ actorId: session.sub, action: "product.updated", entity: "Product", entityId: productId });

  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/admin/products");
  revalidatePath("/admin/inventory");
  revalidatePath("/");
  return { savedAt: Date.now() };
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

/** ⭐ تمييز/إلغاء تمييز منتج كبارز بضغطة من قائمة المنتجات. */
export async function toggleProductFeaturedAction(productId: string, _formData: FormData) {
  const session = await requireAdmin();
  const product = await db.product.findUnique({ where: { id: productId }, select: { isFeatured: true } });
  if (!product) return;
  await db.product.update({ where: { id: productId }, data: { isFeatured: !product.isFeatured } });
  await logAudit({ actorId: session.sub, action: "product.featuredToggled", entity: "Product", entityId: productId, diff: { isFeatured: !product.isFeatured } });
  revalidatePath("/admin/products");
  revalidatePath("/");
}

/** 👁 إظهار المنتج في المتجر أو إخفاؤه (مسودة) بضغطة. */
export async function toggleProductVisibilityAction(productId: string, _formData: FormData) {
  const session = await requireAdmin();
  const product = await db.product.findUnique({ where: { id: productId }, select: { status: true } });
  if (!product) return;
  const status: ProductStatus = product.status === "ACTIVE" ? "DRAFT" : "ACTIVE";
  await db.product.update({ where: { id: productId }, data: { status } });
  await logAudit({ actorId: session.sub, action: status === "ACTIVE" ? "product.published" : "product.hidden", entity: "Product", entityId: productId });
  revalidatePath("/admin/products");
  revalidatePath("/");
}

/** نسخ منتج كامل (الصور، الخيارات، المخزون، الحقول المخصّصة) كمسودة جديدة للتعديل عليها. */
export async function duplicateProductAction(productId: string, _formData: FormData) {
  const session = await requireAdmin();
  const source = await db.product.findUnique({
    where: { id: productId },
    include: { images: { orderBy: { position: "asc" } }, variants: { where: { isActive: true }, include: { inventory: true } } },
  });
  if (!source) return;

  const nameAr = `${source.nameAr} (نسخة)`;
  const slug = await uniqueSlug(slugify(nameAr, "product"), productSlugExists);
  const suffix = () => Math.random().toString(36).slice(2, 6).toUpperCase();
  const copy = await db.product.create({
    data: {
      slug,
      nameAr,
      shortDescAr: source.shortDescAr,
      descAr: source.descAr,
      categoryId: source.categoryId,
      status: "DRAFT",
      isFeatured: false,
      promoTitle: source.promoTitle,
      promoColor: source.promoColor,
      basePrice: source.basePrice,
      comparePrice: source.comparePrice,
      costPrice: source.costPrice,
      metaTitle: source.metaTitle,
      metaDesc: source.metaDesc,
      customFields: source.customFields ?? [],
      optionGroups: source.optionGroups ?? [],
      images: { create: source.images.map((i) => ({ url: i.url, alt: i.alt, position: i.position })) },
      variants: {
        create: source.variants.map((v) => ({
          sku: `${v.sku.slice(0, 40)}-C${suffix()}`,
          nameAr: v.nameAr,
          options: v.options ?? {},
          price: v.price,
          comparePrice: v.comparePrice,
          isActive: v.isActive,
          inventory: { create: { onHand: v.inventory?.onHand ?? 0, reserved: 0, lowStockAt: v.inventory?.lowStockAt ?? 5 } },
        })),
      },
    },
  });
  await logAudit({ actorId: session.sub, action: "product.duplicated", entity: "Product", entityId: copy.id, diff: { from: productId } });
  revalidatePath("/admin/products");
  redirect(`/admin/products/${copy.id}`);
}
