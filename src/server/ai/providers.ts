/**
 * مزوّدو الذكاء الاصطناعي المتاحون (Gemini من قوقل، ChatGPT من OpenAI).
 * المتاح = الذي أُضيف مفتاحه في متغيرات Railway فقط. ملف بلا أسرار — آمن للاستيراد في أي مكان بالخادم.
 */
export const AI_PROVIDERS = ["gemini", "openai"] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

export const AI_PROVIDER_LABEL: Record<AiProvider, string> = { gemini: "Gemini", openai: "ChatGPT" };

/** خطأ برسالة عربية جاهزة للعرض للمدير (مفتاح، رصيد، سياسة محتوى…). */
export class AiError extends Error {}

export function configuredAiProviders(): AiProvider[] {
  return AI_PROVIDERS.filter((p) => (p === "gemini" ? process.env.GEMINI_API_KEY : process.env.OPENAI_API_KEY));
}

/** يتحقق من اختيار المدير: مزوّد معروف ومفتاحه موجود — وإلا أول مزوّد متاح. */
export function resolveProvider(requested: unknown): AiProvider {
  const available = configuredAiProviders();
  if (available.length === 0) throw new AiError("الذكاء الاصطناعي غير مفعّل — أضف GEMINI_API_KEY أو OPENAI_API_KEY في متغيرات Railway");
  const wanted = AI_PROVIDERS.find((p) => p === requested);
  if (wanted && !available.includes(wanted)) throw new AiError(`${AI_PROVIDER_LABEL[wanted]} غير مفعّل — أضف مفتاحه في متغيرات Railway`);
  return wanted ?? available[0]!;
}
