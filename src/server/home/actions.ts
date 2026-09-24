"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/session";
import { logAudit } from "@/server/audit/log";
import { getThemeSettings, saveHomeBlocks, saveThemeSettings } from "@/server/settings";
import { saveUploadedFile, UploadError } from "@/lib/uploads";
import { sanitizeBlocks, type AnyHomeBlock } from "@/lib/home-blocks";

export type SaveHomeResult = { ok?: true; error?: string; blocks?: AnyHomeBlock[] };

const ids = (v: unknown, max: number) =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === "string" && x.length > 0 && x.length <= 40))].slice(0, max) : [];

/**
 * يحفظ أقسام الصفحة الرئيسية كما رتّبها المدير في «تصميم الرئيسية».
 * `featured` (اختياري) = المنتجات البارزة بالترتيب — يُرسل فقط إن عدّلها المدير:
 * تُحدَّث المنتجات المرشّحة (المعروضة له) فقط، فلا يُلمس تمييز منتج أُضيف بعد فتح الصفحة.
 */
export async function saveHomeBlocksAction(input: {
  blocks: unknown;
  featured?: { candidates: unknown; ids: unknown } | null;
}): Promise<SaveHomeResult> {
  const session = await requireAdmin();

  const blocks = sanitizeBlocks(input?.blocks);
  await saveHomeBlocks(blocks);

  if (input?.featured) {
    const candidates = ids(input.featured.candidates, 2000);
    const featured = ids(input.featured.ids, 200).filter((id) => candidates.includes(id));
    if (candidates.length > 0) {
      await db.$transaction([
        db.product.updateMany({ where: { id: { in: candidates.filter((id) => !featured.includes(id)) } }, data: { isFeatured: false } }),
        db.product.updateMany({ where: { id: { in: featured } }, data: { isFeatured: true } }),
      ]);
      const theme = await getThemeSettings();
      await saveThemeSettings({ ...theme, featuredOrder: featured });
    }
  }

  await logAudit({
    actorId: session.sub,
    action: "home.updated",
    entity: "Setting",
    entityId: "theme.homeBlocks",
    diff: { blocks: blocks.length, visible: blocks.filter((b) => b.visible).length },
  });

  revalidatePath("/");
  revalidatePath("/admin/homepage");
  return { ok: true, blocks };
}

/** رفع صورة لقسم بالصفحة الرئيسية (سلايدر، بانر، صور مربعة، شعارات) — صور فقط. */
export async function uploadHomeImageAction(formData: FormData): Promise<{ url?: string; error?: string }> {
  await requireAdmin();
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) return { error: "لم يتم اختيار صورة" };
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return { error: "يرجى رفع صورة JPG أو PNG أو WEBP" };
  try {
    return { url: await saveUploadedFile(file, "home") };
  } catch (e) {
    return { error: e instanceof UploadError ? e.message : "تعذّر رفع الصورة" };
  }
}
