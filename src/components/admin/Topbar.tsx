export function Topbar({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    // ps-16 يترك مساحة لزر القائمة العائم على الجوال (MobileSidebar)؛
    // flex-col على الجوال يفصل العنوان عن الأزرار في صفّين بدل ازدحامها أفقياً.
    // هوية المستخدم الإداري وزر تسجيل الخروج يظهران بالشريط الجانبي (Sidebar)
    // لا هنا، لتفادي تكرارها في كل صفحة.
    <header className="sticky top-0 z-20 flex flex-col gap-3 border-b bg-[var(--surface-raised)]/90 ps-16 pe-5 py-4 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between lg:px-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </header>
  );
}
