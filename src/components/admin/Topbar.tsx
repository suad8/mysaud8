export function Topbar({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    // ps-16 يترك مساحة لزر القائمة العائم على الجوال (MobileSidebar)؛
    // flex-col على الجوال يفصل العنوان عن الأزرار في صفّين بدل ازدحامها أفقياً.
    <header className="sticky top-0 z-20 flex flex-col gap-3 border-b bg-[var(--surface-raised)]/90 ps-16 pe-5 py-4 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between lg:px-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {actions}
        <div className="flex items-center gap-2.5 rounded-xl border ps-3 pe-1 py-1">
          <div className="hidden text-end sm:block">
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
