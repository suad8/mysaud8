import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";

export function Rating({
  value,
  count,
  size = 14,
  className,
}: {
  value: number;
  count?: number;
  size?: number;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)} title={`${value} من 5`}>
      <span className="flex items-center gap-0.5" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <svg
            key={i}
            width={size}
            height={size}
            viewBox="0 0 20 20"
            className={i < Math.round(value) ? "fill-gold-500" : "fill-ink-300 dark:fill-ink-700"}
          >
            <path d="M10 1.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.6 7.7l5.8-.8z" />
          </svg>
        ))}
      </span>
      <span className="sr-only">{value} من 5</span>
      {count != null && (
        <span className="num text-xs text-muted">({formatNumber(count)})</span>
      )}
    </span>
  );
}
