import { cn } from "@/lib/cn";

export function StatCard({
  label,
  value,
  delta,
  tone = "up",
  icon,
}: {
  label: string;
  value: string;
  delta?: string;
  tone?: "up" | "down";
  icon: string;
}) {
  return (
    <div className="surface-card p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm text-muted">{label}</p>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 dark:bg-brand-950">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4.5 w-4.5 stroke-brand-700 dark:stroke-brand-400">
            <path d={icon} />
          </svg>
        </span>
      </div>
      <p className="num mt-3 text-2xl font-bold tracking-tight">{value}</p>
      {delta && (
        <p className={cn("num mt-1.5 flex items-center gap-1 text-xs font-medium", tone === "up" ? "text-emerald-600" : "text-red-600")}>
          <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" className={cn("h-3.5 w-3.5", tone === "down" && "rotate-180")}>
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
          {delta}
        </p>
      )}
    </div>
  );
}
