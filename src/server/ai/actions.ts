"use server";

import sharp from "sharp";
import { requireAdmin } from "@/server/auth/session";
import { logAudit } from "@/server/audit/log";
import { createRateLimiter } from "@/lib/rate-limit";
import { readValidatedImage, saveJpegBuffer, UploadError } from "@/lib/uploads";
import { AiImageError, generateImage, generateJson } from "@/server/ai/gemini";
import { getStoreInfoSettings } from "@/server/settings";
import { sanitizeOptionGroups } from "@/lib/product-options";

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

export type AiCopyTone = "professional" | "friendly";
export type AiCopyState = { error?: string; shortDesc?: string; description?: string };

/** النصوص أرخص كثيراً من الصور — حد سخي يمنع فقط الاستخدام الآلي غير المقصود. */
const copyGenerations = createRateLimiter({ max: 60, windowMs: 60 * 60 * 1000 });

const COPY_SCHEMA = {
  type: "OBJECT",
  properties: { shortDesc: { type: "STRING" }, description: { type: "STRING" } },
  required: ["shortDesc", "description"],
};

/** تنظيف ما يرجعه النموذج: بلا تنسيق Markdown، أسطر مرتبة، وأطوال محدودة. */
function cleanCopy(text: unknown, max: number): string {
  if (typeof text !== "string") return "";
  return text
    .replace(/\*\*|__|`|^#+\s*/gm, "")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
}

/**
 * يكتب «الوصف المختصر» و«الوصف الكامل» للمنتج بالعربية من اسمه وتصنيفه وخياراته
 * وملاحظات المدير — للمعاينة فقط، ولا يُحفظ شيء إلا إن اختاره المدير وحفظ المنتج.
 */
export async function generateProductCopyAction(input: {
  name: unknown;
  category?: unknown;
  optionGroups?: unknown;
  details?: unknown;
  tone?: unknown;
}): Promise<AiCopyState> {
  const session = await requireAdmin();
  const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const name = str(input?.name, 120);
  if (!name) return { error: "اكتب اسم المنتج أولاً" };
  const category = str(input?.category, 80);
  const details = str(input?.details, 600);
  const tone: AiCopyTone = input?.tone === "friendly" ? "friendly" : "professional";
  let groups: ReturnType<typeof sanitizeOptionGroups> = [];
  try {
    groups = sanitizeOptionGroups(typeof input?.optionGroups === "string" ? JSON.parse(input.optionGroups) : []);
  } catch {
    groups = [];
  }
  const options = groups.map((g) => `${g.name}: ${g.values.join("، ")}`).join("؛ ");

  if (!copyGenerations.hit(session.sub)) return { error: "بلغت حد كتابة الأوصاف (60 في الساعة) — حاول لاحقاً" };

  const store = await getStoreInfoSettings();
  const prompt = [
    `أنت كاتب محتوى تسويقي محترف لمتجر إلكتروني سعودي اسمه «${store.name}»${store.tagline ? ` (${store.tagline})` : ""}.`,
    `اكتب وصفاً بالعربية لمنتج اسمه: «${name}».`,
    category ? `التصنيف: ${category}.` : "",
    options ? `الخيارات المتاحة للعميل: ${options}.` : "",
    details ? `معلومات من صاحب المتجر (اعتمد عليها): ${details}` : "",
    tone === "friendly" ? "الأسلوب: ودّي وتسويقي قريب من العميل السعودي، بعربية فصحى سهلة." : "الأسلوب: احترافي وواضح بعربية فصحى سهلة.",
    "المطلوب:",
    "- shortDesc: جملة واحدة جذابة بين 60 و140 حرفاً تُعرض تحت اسم المنتج.",
    "- description: وصف كامل بين 80 و180 كلمة: فقرة افتتاحية قصيرة، ثم 3 إلى 5 مميزات كل واحدة في سطر يبدأ بـ «• »، ثم سطر أخير عن الاستخدامات أو الجهات المناسبة.",
    "قواعد صارمة: لا تخترع أرقاماً أو مقاسات أو أسعاراً أو مدة توصيل أو ضمانات لم تُذكر أعلاه. لا إيموجي، لا عناوين، لا تنسيق Markdown، ولا تذكر أنك ذكاء اصطناعي.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const out = await generateJson<{ shortDesc?: unknown; description?: unknown }>(prompt, COPY_SCHEMA);
    const shortDesc = cleanCopy(out.shortDesc, 200).replace(/\n+/g, " ");
    const description = cleanCopy(out.description, 3000);
    if (!shortDesc || !description) return { error: "لم يُرجع Gemini وصفاً كاملاً هذه المرة — حاول مرة أخرى" };
    await logAudit({ actorId: session.sub, action: "ai.copyGenerated", entity: "Product", diff: { name, tone } });
    return { shortDesc, description };
  } catch (e) {
    if (e instanceof AiImageError) return { error: e.message };
    console.error("[ai-copy] failed:", e instanceof Error ? e.name : "unknown");
    return { error: "حدث خطأ أثناء كتابة الوصف — حاول مرة أخرى" };
  }
}
