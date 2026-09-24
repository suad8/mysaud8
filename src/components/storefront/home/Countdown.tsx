"use client";

import { useEffect, useState } from "react";

const UNITS = [
  { label: "يوم", ms: 86400000 },
  { label: "ساعة", ms: 3600000 },
  { label: "دقيقة", ms: 60000 },
  { label: "ثانية", ms: 1000 },
];

/** عدّاد تنازلي حيّ حتى لحظة محددة — يبدأ بعد التحميل لتفادي اختلاف وقت الخادم والمتصفح. */
export function Countdown({ target }: { target: number }) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  let left = now === null ? null : Math.max(0, target - now);
  if (left === 0) return <p className="text-sm font-semibold">انتهى العرض</p>;

  return (
    <div className="flex gap-2 sm:gap-3" dir="rtl" role="timer" aria-live="off">
      {UNITS.map((u) => {
        let value: number | null = null;
        if (left !== null) {
          value = Math.floor(left / u.ms);
          left -= value * u.ms;
        }
        return (
          <div key={u.label} className="grid min-w-16 place-items-center rounded-2xl bg-white/10 px-3 py-2.5 ring-1 ring-inset ring-white/20">
            <span className="num text-2xl font-extrabold tabular-nums sm:text-3xl">{value === null ? "–" : String(value).padStart(2, "0")}</span>
            <span className="text-[11px] text-white/75">{u.label}</span>
          </div>
        );
      })}
    </div>
  );
}
