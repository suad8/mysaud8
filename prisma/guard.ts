/**
 * حارس للسكربتات التي تحذف بيانات (seed / fresh-start / clear-demo).
 *
 * على بيئة Railway أو أي بيئة إنتاج، أو إن كانت قاعدة البيانات ليست محلية،
 * يرفض التشغيل ما لم يُمرَّر CONFIRM_DESTRUCTIVE=yes صراحةً — يمنع حذف
 * بيانات الإنتاج بأمر كُتب بالخطأ أو شُغِّل تلقائياً.
 */
function isLocalDatabase(): boolean {
  const url = process.env.DATABASE_URL ?? "";
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false;
  }
}

export function assertDestructiveAllowed(scriptName: string) {
  const onRailway = Boolean(process.env.RAILWAY_ENVIRONMENT_NAME || process.env.RAILWAY_PROJECT_ID);
  const production = process.env.NODE_ENV === "production";
  if (!onRailway && !production && isLocalDatabase()) return;

  if (process.env.CONFIRM_DESTRUCTIVE !== "yes") {
    console.error(
      `⛔ ${scriptName} يحذف بيانات، وقاعدة البيانات الحالية ليست محلية (إنتاج/Railway).\n` +
        "   خذ نسخة احتياطية أولاً (npm run db:backup)، ثم أعد التشغيل مع CONFIRM_DESTRUCTIVE=yes إن كنت متأكداً.",
    );
    process.exit(1);
  }
}
