export function Topbar({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b bg-[var(--surface-raised)]/90 px-5 py-4 backdrop-blur-md lg:px-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {actions}
        <div className="flex items-center gap-2.5 rounded-xl border ps-3 pe-1 py-1">
          <div className="text-end">
            <p className="text-xs font-semibold leading-tight">مدير المتجر</p>
            <p className="text-[11px] text-muted leading-tight">مالك</p>
          </div>
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-900 dark:text-brand-300">
            م
          </span>
        </div>
      </div>
    </header>
  );
}
