/** يُستدعى مرة عند تشغيل كل نسخة خادم (Next.js instrumentation). */
export async function register() {
  // الخادم فقط — لا أثناء البناء (قاعدة البيانات غير متاحة وقتها على Railway) ولا في Edge
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NEXT_PHASE === "phase-production-build") return;
  const { runStartupMigrations } = await import("@/server/migrations");
  // بلا انتظار: لا يؤخر بدء استقبال الزوار
  void runStartupMigrations();
}
