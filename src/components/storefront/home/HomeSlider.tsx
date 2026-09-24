"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Slide } from "@/lib/home-blocks";

/**
 * سلايدر صور الصفحة الرئيسية: تلاشٍ بين الشرائح (لا يتأثر باتجاه RTL)،
 * تشغيل تلقائي يتوقف عند المرور بالمؤشر أو التركيز، ويحترم «تقليل الحركة».
 */
export function HomeSlider({ slides, autoplay, priority }: { slides: Slide[]; autoplay: boolean; priority?: boolean }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = slides.length;

  useEffect(() => {
    if (!autoplay || paused || count < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % count), 5000);
    return () => window.clearInterval(timer);
  }, [autoplay, paused, count]);

  const go = (delta: number) => setIndex((i) => (i + delta + count) % count);

  return (
    <div
      className="group relative aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] bg-brand-900 sm:aspect-[21/9]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      aria-roledescription="carousel"
    >
      {slides.map((s, i) => {
        const active = i === index;
        return (
          <div
            key={i}
            aria-hidden={!active}
            aria-roledescription="slide"
            aria-label={`${i + 1} من ${count}`}
            className={`absolute inset-0 transition-opacity duration-700 ${active ? "opacity-100" : "pointer-events-none opacity-0"}`}
          >
            {s.imageUrl ? (
              <Image src={s.imageUrl} alt={s.title} fill sizes="(max-width: 1280px) 100vw, 1280px" className="object-cover" priority={priority && i === 0} />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-brand-700 to-brand-950" />
            )}
            {(s.title || s.subtitle || s.buttonText) && (
              <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/65 via-black/20 to-transparent p-6 sm:items-center sm:bg-gradient-to-l sm:p-12">
                <div className="max-w-lg text-white">
                  {s.title && <h2 className="text-2xl font-extrabold leading-snug sm:text-4xl">{s.title}</h2>}
                  {s.subtitle && <p className="mt-2 text-sm leading-relaxed text-white/85 sm:text-base">{s.subtitle}</p>}
                  {s.buttonText && s.href && (
                    <Link
                      href={s.href}
                      tabIndex={active ? 0 : -1}
                      className="mt-5 inline-flex h-11 items-center rounded-full bg-accent-500 px-6 text-sm font-semibold text-on-accent hover:bg-accent-400"
                    >
                      {s.buttonText}
                    </Link>
                  )}
                </div>
              </div>
            )}
            {/* شريحة بلا زر لكن لها رابط: الصورة كلها قابلة للنقر */}
            {s.href && !s.buttonText && <Link href={s.href} tabIndex={active ? 0 : -1} aria-label={s.title || "فتح العرض"} className="absolute inset-0" />}
          </div>
        );
      })}

      {count > 1 && (
        <>
          <button type="button" onClick={() => go(-1)} aria-label="الشريحة السابقة" className="absolute start-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-lg text-ink-900 opacity-0 shadow transition-opacity group-hover:opacity-100 focus:opacity-100">
            ›
          </button>
          <button type="button" onClick={() => go(1)} aria-label="الشريحة التالية" className="absolute end-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-lg text-ink-900 opacity-0 shadow transition-opacity group-hover:opacity-100 focus:opacity-100">
            ‹
          </button>
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`الشريحة ${i + 1}`}
                aria-current={i === index}
                className={`h-2 rounded-full transition-all ${i === index ? "w-6 bg-white" : "w-2 bg-white/55 hover:bg-white/80"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
