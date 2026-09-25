"use client";

import { useEffect, useState } from "react";
import { AI_PROVIDER_LABEL, type AiProvider } from "@/server/ai/providers";

const STORAGE_KEY = "gp.aiProvider";

/**
 * اختيار مزوّد الذكاء الاصطناعي (Gemini / ChatGPT) — يُتذكّر آخر اختيار في هذا المتصفح.
 * الافتراضي: ChatGPT إن كان مفعّلاً، وإلا المتاح.
 */
export function useAiProvider(providers: AiProvider[]) {
  const fallback = providers.includes("openai") ? "openai" : providers[0];
  const [provider, setProvider] = useState<AiProvider | undefined>(fallback);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY) as AiProvider | null;
      if (saved && providers.includes(saved)) setProvider(saved);
    } catch {
      // التخزين المحلي غير متاح (تصفح خاص) — نبقى على الافتراضي
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providers.join(",")]);

  const choose = (p: AiProvider) => {
    setProvider(p);
    try {
      window.localStorage.setItem(STORAGE_KEY, p);
    } catch {
      // تجاهل
    }
  };
  return [provider, choose] as const;
}

export function AiProviderPicker({ providers, value, onChange }: { providers: AiProvider[]; value: AiProvider | undefined; onChange: (p: AiProvider) => void }) {
  if (providers.length < 2) {
    return providers[0] ? <span className="text-[11px] text-muted">بواسطة {AI_PROVIDER_LABEL[providers[0]]}</span> : null;
  }
  return (
    <div className="flex items-center gap-1.5 text-xs" role="radiogroup" aria-label="خدمة الذكاء الاصطناعي">
      <span className="text-muted">الخدمة:</span>
      {providers.map((p) => (
        <button
          key={p}
          type="button"
          role="radio"
          aria-checked={value === p}
          onClick={() => onChange(p)}
          className={`rounded-full border px-3 py-1 font-medium ${value === p ? "border-brand-600 bg-brand-600 text-white" : "hover:bg-[var(--surface-sunken)]"}`}
        >
          {AI_PROVIDER_LABEL[p]}
        </button>
      ))}
    </div>
  );
}
