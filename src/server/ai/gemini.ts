/**
 * الذكاء الاصطناعي عبر Gemini (Google AI Studio): صور المنتجات ونصوص وصفها.
 * المفتاح في متغير البيئة GEMINI_API_KEY على الخادم فقط — لا يصل للمتصفح ولا يُسجَّل أبداً.
 * النماذج قابلة للتغيير عبر GEMINI_IMAGE_MODEL و GEMINI_TEXT_MODEL دون تعديل الكود.
 */
import { AiError } from "@/server/ai/providers";

const API_BASE = process.env.GEMINI_API_BASE_URL || "https://generativelanguage.googleapis.com";
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
const TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash";
const TIMEOUT_MS = 90_000;

type Part = { text?: string; inlineData?: { mimeType?: string; data?: string } };
type GeminiResponse = {
  candidates?: { content?: { parts?: Part[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
};

/** طلب generateContent واحد مع رسائل أخطاء واضحة بالعربي (مفتاح، حصة، نموذج غير متاح). */
async function callGemini(model: string, modelEnv: string, body: object): Promise<GeminiResponse> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new AiError("الذكاء الاصطناعي غير مفعّل — أضف GEMINI_API_KEY في متغيرات Railway");

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new AiError("تعذّر الاتصال بخدمة Gemini — حاول مرة أخرى بعد قليل");
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 429) {
      // قوقل تحدد السبب في نص الرد: حصة صفر = النموذج غير مشمول بالخطة المجانية أصلاً
      if (/limit:\s*0\b|"quotaValue":\s*"0"/.test(text)) {
        throw new AiError("الخطة المجانية في Gemini لا تشمل هذه الميزة — فعّل الفوترة (Billing) في Google AI Studio ثم أعد المحاولة");
      }
      if (/free_?tier/i.test(text)) {
        throw new AiError("انتهت الحصة المجانية لـ Gemini لليوم أو للدقيقة — انتظر قليلاً، أو فعّل الفوترة في Google AI Studio لرفع الحد");
      }
      throw new AiError("تجاوزت حد الاستخدام في Gemini — انتظر قليلاً أو راجع الفوترة في Google AI Studio");
    }
    if (res.status === 401 || res.status === 403 || /API_KEY_INVALID|API key not valid/i.test(text)) {
      throw new AiError("مفتاح Gemini غير صالح أو لا يملك الصلاحية (قد يلزم تفعيل الفوترة في Google AI Studio)");
    }
    if (res.status === 404) throw new AiError(`النموذج "${model}" غير متاح لحسابك — غيّر ${modelEnv}`);
    throw new AiError(`رفضت خدمة Gemini الطلب (رمز ${res.status}) — حاول مجدداً`);
  }

  const json = (await res.json().catch(() => null)) as GeminiResponse | null;
  if (json?.promptFeedback?.blockReason || json?.candidates?.[0]?.finishReason === "SAFETY") {
    throw new AiError("رفض Gemini الطلب لأسباب تتعلق بسياسة المحتوى — غيّر الوصف");
  }
  return json ?? {};
}

export async function generateImage({
  prompt,
  referenceImage,
}: {
  prompt: string;
  referenceImage?: { buffer: Buffer; mimeType: string };
}): Promise<Buffer> {
  const parts: Part[] = [{ text: prompt }];
  if (referenceImage) parts.push({ inlineData: { mimeType: referenceImage.mimeType, data: referenceImage.buffer.toString("base64") } });

  const json = await callGemini(IMAGE_MODEL, "GEMINI_IMAGE_MODEL", {
    contents: [{ role: "user", parts }],
    generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
  });
  const image = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data && p.inlineData.mimeType?.startsWith("image/"));
  if (!image?.inlineData?.data) throw new AiError("لم يُرجع Gemini صورة هذه المرة — حاول مرة أخرى");
  return Buffer.from(image.inlineData.data, "base64");
}

/** نص منظّم (JSON) بحقول نصية مطلوبة — يُتحقق من شكله قبل إرجاعه. */
export async function generateJson<T>(prompt: string, fields: string[]): Promise<T> {
  const schema = { type: "OBJECT", properties: Object.fromEntries(fields.map((f) => [f, { type: "STRING" }])), required: fields };
  const json = await callGemini(TEXT_MODEL, "GEMINI_TEXT_MODEL", {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json", responseSchema: schema, temperature: 0.8 },
  });
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new AiError("لم يُرجع Gemini نصاً صالحاً هذه المرة — حاول مرة أخرى");
  }
}
