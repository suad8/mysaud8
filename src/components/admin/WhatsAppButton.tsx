"use client";

import { useTransition } from "react";

/** زر يفتح محادثة واتساب برسالة جاهزة، ويستدعي (اختيارياً) إجراءً على الخادم لتسجيل الإرسال. */
export function WhatsAppButton({
  href,
  label = "واتساب",
  onSent,
  size = "sm",
}: {
  href: string;
  label?: string;
  onSent?: () => Promise<void>;
  size?: "sm" | "md";
}) {
  const [, startTransition] = useTransition();
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => onSent && startTransition(() => onSent())}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full bg-[#25d366] font-semibold text-white transition-colors hover:bg-[#1ebe5b] ${size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm"}`}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
        <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.7-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.4Z" />
      </svg>
      {label}
    </a>
  );
}
