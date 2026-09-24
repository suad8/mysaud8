/**
 * توليد صور المنتجات عبر Gemini (Google AI Studio). المفتاح في متغير البيئة
 * GEMINI_API_KEY على الخادم فقط — لا يصل للمتصفح ولا يُسجَّل أبداً.
 * النموذج قابل للتغيير عبر GEMINI_IMAGE_MODEL دون تعديل الكود.
 */
const API_BASE = process.env.GEMINI_API_BASE_URL || "https://generativelanguage.googleapis.com";
const MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
const TIMEOUT_MS = 90_000;

export class AiImageError extends Error {}

export function isAiImageConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

type Part = { text?: string; inlineData?: { mimeType?: string; data?: string } };

export async function generateImage({
  prompt,
  referenceImage,
}: {
  prompt: string;
  referenceImage?: { buffer: Buffer; mimeType: string };
}): Promise<Buffer> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new AiImageError("توليد الصور غير مفعّل — أضف GEMINI_API_KEY في متغيرات Railway");

  const parts: Part[] = [{ text: prompt }];
  if (referenceImage) parts.push({ inlineData: { mimeType: referenceImage.mimeType, data: referenceImage.buffer.toString("base64") } });

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ contents: [{ role: "user", parts }], generationConfig: { responseModalities: ["TEXT", "IMAGE"] } }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new AiImageError("تعذّر الاتصال بخدمة Gemini — حاول مرة أخرى بعد قليل");
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 429) throw new AiImageError("تجاوزت حد الاستخدام في Gemini — انتظر قليلاً أو راجع الفوترة في Google AI Studio");
    if (res.status === 401 || res.status === 403 || /API_KEY_INVALID|API key not valid/i.test(body)) {
      throw new AiImageError("مفتاح Gemini غير صالح أو لا يملك صلاحية توليد الصور (قد يلزم تفعيل الفوترة)");
    }
    if (res.status === 404) throw new AiImageError(`نموذج الصور "${MODEL}" غير متاح لحسابك — غيّر GEMINI_IMAGE_MODEL`);
    throw new AiImageError(`رفضت خدمة Gemini الطلب (رمز ${res.status}) — عدّل الوصف وحاول مجدداً`);
  }

  const json = (await res.json().catch(() => null)) as {
    candidates?: { content?: { parts?: Part[] }; finishReason?: string }[];
    promptFeedback?: { blockReason?: string };
  } | null;
  const image = json?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data && p.inlineData.mimeType?.startsWith("image/"));
  if (!image?.inlineData?.data) {
    if (json?.promptFeedback?.blockReason || json?.candidates?.[0]?.finishReason === "SAFETY") {
      throw new AiImageError("رفض Gemini الوصف لأسباب تتعلق بسياسة المحتوى — غيّر الوصف");
    }
    throw new AiImageError("لم يُرجع Gemini صورة هذه المرة — حاول مرة أخرى");
  }
  return Buffer.from(image.inlineData.data, "base64");
}
