import { Button } from "@/components/ui/Button";

export const metadata = { title: "حسابي" };

/**
 * تسجيل الدخول وحساب العميل ميزة مؤجَّلة (المرحلة 3 في docs/PLAN.md).
 * هذه صفحة نائبة بدل 404 خام حتى يُبنى تسجيل الدخول الفعلي.
 */
export default function AccountPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-50 dark:bg-brand-950">
        <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 stroke-brand-600 dark:stroke-brand-400">
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
        </svg>
      </span>
      <h1 className="mt-5 text-xl font-bold tracking-tight">تسجيل الدخول قريباً</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        حسابات العملاء وتتبّع الطلبات قيد الإنشاء حالياً. يمكنك حالياً إتمام الشراء كضيف دون تسجيل.
      </p>
      <Button href="/" variant="secondary" className="mt-6">
        العودة للمتجر
      </Button>
    </div>
  );
}
