import Link from "next/link";
import { cn } from "@/lib/cn";

const VARIANTS = {
  primary:
    "bg-brand-700 text-white hover:bg-brand-800 active:bg-brand-900 shadow-sm dark:bg-brand-600 dark:hover:bg-brand-500",
  secondary:
    "bg-[var(--surface-raised)] text-[var(--text-strong)] ring-1 ring-inset ring-[var(--border-subtle)] hover:bg-ink-100 dark:hover:bg-ink-800",
  gold: "bg-gold-500 text-ink-950 hover:bg-gold-400 active:bg-gold-600 shadow-sm",
  ghost: "text-[var(--text-strong)] hover:bg-ink-100 dark:hover:bg-ink-800",
  danger: "bg-red-600 text-white hover:bg-red-700",
} as const;

const SIZES = {
  sm: "h-9 px-3.5 text-sm rounded-lg gap-1.5",
  md: "h-11 px-5 text-sm rounded-xl gap-2",
  lg: "h-13 px-7 text-base rounded-xl gap-2.5",
} as const;

type Props = {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  href?: string;
  className?: string;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({
  variant = "primary",
  size = "md",
  href,
  className,
  children,
  ...rest
}: Props) {
  const classes = cn(
    "inline-flex items-center justify-center font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none",
    VARIANTS[variant],
    SIZES[size],
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
