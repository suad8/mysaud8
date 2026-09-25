/**
 * الذكاء الاصطناعي عبر OpenAI (ChatGPT): صور المنتجات (gpt-image-1) ونصوص وصفها.
 * المفتاح في متغير البيئة OPENAI_API_KEY على الخادم فقط — لا يصل للمتصفح ولا يُسجَّل أبداً.
 * النماذج قابلة للتغيير عبر OPENAI_IMAGE_MODEL و OPENAI_TEXT_MODEL دون تعديل الكود.
 */
import { AiError } from "@/server/ai/providers";

const API_BASE = process.env.OPENAI_API_BASE_URL || "https://api.openai.com";
const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
const TEXT_MODEL = process.env.OPENAI_TEXT_MODEL || "gpt-4o-mini";
const TIMEOUT_MS = 120_000;

/** طلب واحد لـ OpenAI مع رسائل أخطاء واضحة بالعربي (مفتاح، رصيد، توثيق المنظمة، نموذج غير متاح). */
async function callOpenAi(path: string, model: string, modelEnv: string, body: BodyInit, json: boolean): Promise<unknown> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new AiError("ChatGPT غير مفعّل — أضف OPENAI_API_KEY في متغيرات Railway");

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/v1/${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, ...(json ? { "Content-Type": "application/json" } : {}) },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new AiError("تعذّر الاتصال بخدمة OpenAI — حاول مرة أخرى بعد قليل");
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (/insufficient_quota|billing_hard_limit|plan and billing/i.test(text)) throw new AiError("رصيد OpenAI غير كافٍ — اشحن الرصيد من platform.openai.com ← Billing ثم أعد المحاولة");
    if (res.status === 429) throw new AiError("تجاوزت حد الاستخدام في OpenAI — انتظر دقيقة وحاول مجدداً");
    if (res.status === 401) throw new AiError("مفتاح OpenAI غير صالح — أنشئ مفتاحاً جديداً من platform.openai.com وضعه في Railway");
    if (/verif/i.test(text)) {
      throw new AiError("OpenAI يطلب توثيق حسابك لاستخدام توليد الصور — من platform.openai.com ← Settings ← Organization ← Verify، ثم انتظر قليلاً");
    }
    if (res.status === 403) throw new AiError("مفتاح OpenAI لا يملك صلاحية هذه الميزة — تحقق من صلاحيات المفتاح في platform.openai.com");
    if (res.status === 404 || /model_not_found|does not exist/i.test(text)) throw new AiError(`النموذج "${model}" غير متاح لحسابك — غيّر ${modelEnv}`);
    if (/safety|moderation|content_policy/i.test(text)) throw new AiError("رفض OpenAI الطلب لأسباب تتعلق بسياسة المحتوى — غيّر الوصف");
    throw new AiError(`رفضت خدمة OpenAI الطلب (رمز ${res.status}) — حاول مجدداً`);
  }
  return res.json().catch(() => null);
}

/**
 * صورة مربعة من OpenAI: توليد من الوصف، أو «تعديل» يطبّق الشعار المرفق على المنتج (موك أب).
 */
export async function openAiGenerateImage({
  prompt,
  referenceImage,
}: {
  prompt: string;
  referenceImage?: { buffer: Buffer; mimeType: string };
}): Promise<Buffer> {
  let json: unknown;
  if (referenceImage) {
    const form = new FormData();
    form.set("model", IMAGE_MODEL);
    form.set("prompt", prompt);
    form.set("size", "1024x1024");
    form.set("quality", "medium");
    const ext = referenceImage.mimeType.split("/")[1] ?? "png";
    form.set("image", new Blob([new Uint8Array(referenceImage.buffer)], { type: referenceImage.mimeType }), `logo.${ext}`);
    json = await callOpenAi("images/edits", IMAGE_MODEL, "OPENAI_IMAGE_MODEL", form, false);
  } else {
    json = await callOpenAi(
      "images/generations",
      IMAGE_MODEL,
      "OPENAI_IMAGE_MODEL",
      JSON.stringify({ model: IMAGE_MODEL, prompt, size: "1024x1024", quality: "medium", n: 1 }),
      true,
    );
  }
  const b64 = (json as { data?: { b64_json?: string }[] } | null)?.data?.[0]?.b64_json;
  if (!b64) throw new AiError("لم يُرجع OpenAI صورة هذه المرة — حاول مرة أخرى");
  return Buffer.from(b64, "base64");
}

/** نص منظّم (JSON) بحقول نصية مطلوبة عبر Structured Outputs. */
export async function openAiGenerateJson<T>(prompt: string, fields: string[]): Promise<T> {
  const schema = {
    type: "object",
    properties: Object.fromEntries(fields.map((f) => [f, { type: "string" }])),
    required: fields,
    additionalProperties: false,
  };
  const json = (await callOpenAi(
    "chat/completions",
    TEXT_MODEL,
    "OPENAI_TEXT_MODEL",
    JSON.stringify({
      model: TEXT_MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_schema", json_schema: { name: "result", strict: true, schema } },
      temperature: 0.8,
    }),
    true,
  )) as { choices?: { message?: { content?: string; refusal?: string } }[] } | null;
  const message = json?.choices?.[0]?.message;
  if (message?.refusal) throw new AiError("رفض ChatGPT الطلب — غيّر الوصف وحاول مجدداً");
  try {
    return JSON.parse(message?.content ?? "") as T;
  } catch {
    throw new AiError("لم يُرجع ChatGPT نصاً صالحاً هذه المرة — حاول مرة أخرى");
  }
}
