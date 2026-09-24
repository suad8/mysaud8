"use server";

import sharp from "sharp";
import { requireAdmin } from "@/server/auth/session";
import { logAudit } from "@/server/audit/log";
import { createRateLimiter } from "@/lib/rate-limit";
import { readValidatedImage, saveJpegBuffer, UploadError } from "@/lib/uploads";
import { AiImageError, generateImage } from "@/server/ai/gemini";

export type AiImageStyle = "studio" | "lifestyle" | "logo";
export type AiImageState = { error?: string; imageUrl?: string };

/** كل صورة لها تكلفة في Gemini — حد لكل مدير يمنع الاستهلاك غير المقصود. */
const generations = createRateLimiter({ max: 30, windowMs: 60 * 60 * 1000 });

const BRAND = "Use the brand colors royal purple (#663DFF) and golden yellow (#FFC430) tastefully in the design.";

function buildPrompt(style: AiImageStyle, name: string, details: string, brandColors: boolean): string {
  const subject = `Product: "${name}".${details ? ` Details: ${details}.` : ""}`;
  const common = "Square 1:1 composition, product centered and fully visible, sharp focus, photorealistic, high resolution. No text overlays, no captions, no watermark.";
  const brand = brandColors ? ` ${BRAND}` : "";
  switch (style) {
    case "lifestyle":
      return `Premium commercial photograph (mockup) of the product in a realistic setting where it is used, such as a café counter, office desk or exhibition, with soft natural light and shallow depth of field. ${subject}${brand} ${common}`;
    case "logo":
      return `Create a photorealistic product mockup. ${subject} Apply the attached logo/design image onto the product surface realistically — correct perspective, curvature, lighting and material texture, keeping the design's colors and proportions. Clean light studio background with soft shadow.${brand} ${common}`;
    default:
      return `Professional e-commerce product photo on a clean seamless light studio background with soft natural shadow, realistic materials and lighting. ${subject}${brand} ${common}`;
  }
}

/**
 * يولّد صورة منتج بـ Gemini ويحفظها (1200×1200 JPEG) — تُعاد للنموذج كمعاينة،
 * ولا تُربط بالمنتج إلا إن اختارها المدير وحفظ المنتج.
 */
export async function generateProductImageAction(formData: FormData): Promise<AiImageState> {
  const session = await requireAdmin();

  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const details = String(formData.get("details") ?? "").trim().slice(0, 500);
  const styleRaw = String(formData.get("style") ?? "studio");
  const style: AiImageStyle = styleRaw === "lifestyle" || styleRaw === "logo" ? styleRaw : "studio";
  const brandColors = formData.get("brandColors") === "on";
  if (!name) return { error: "اكتب اسم المنتج أولاً" };

  let referenceImage: { buffer: Buffer; mimeType: string } | undefined;
  const file = formData.get("reference");
  if (style === "logo") {
    if (!(file instanceof File) || file.size === 0) return { error: "ارفع الشعار أو التصميم لوضعه على المنتج" };
    try {
      referenceImage = await readValidatedImage(file);
    } catch (e) {
      return { error: e instanceof UploadError ? e.message : "تعذّر قراءة الصورة" };
    }
  }

  if (!generations.hit(session.sub)) return { error: "بلغت حد التوليد (30 صورة في الساعة) — حاول لاحقاً" };

  try {
    const raw = await generateImage({ prompt: buildPrompt(style, name, details, brandColors), referenceImage });
    // توحيد المقاس والصيغة وإزالة أي بيانات وصفية مضمّنة
    const jpeg = await sharp(raw).rotate().resize(1200, 1200, { fit: "cover" }).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
    const imageUrl = await saveJpegBuffer(jpeg, "products");
    await logAudit({ actorId: session.sub, action: "ai.imageGenerated", entity: "Product", diff: { name, style } });
    return { imageUrl };
  } catch (e) {
    if (e instanceof AiImageError) return { error: e.message };
    console.error("[ai-image] failed:", e instanceof Error ? e.name : "unknown");
    return { error: "حدث خطأ أثناء معالجة الصورة — حاول مرة أخرى" };
  }
}
