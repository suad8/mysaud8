import { formatAmount, discountPercent } from "@/lib/format";
import { cn } from "@/lib/cn";

/** رمز الريال السعودي الرسمي — يُعرض بحجم أصغر قليلاً من الرقم. */
function Riyal({ className }: { className?: string }) {
  return <span className={cn("text-[0.78em] font-normal opacity-80", className)}>ر.س</span>;
}

export function Price({
  value,
  compareAt,
  size = "md",
  className,
}: {
  value: number | string;
  compareAt?: number | string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const price = Number(value);
  const compare = compareAt == null ? null : Number(compareAt);
  const off = compare ? discountPercent(price, compare) : 0;

  const sizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-2xl",
  }[size];

  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5", className)}>
      <span className={cn("num font-semibold tracking-tight", sizes)}>
        {formatAmount(price)} <Riyal />
      </span>
      {off > 0 && compare && (
        <>
          <span className="num text-xs text-muted line-through decoration-1">
            {formatAmount(compare)}
          </span>
          <span className="rounded bg-red-50 px-1.5 py-0.5 text-[11px] font-semibold text-red-600 dark:bg-red-950 dark:text-red-400">
            <span className="num">−{off}%</span>
          </span>
        </>
      )}
    </span>
  );
}
