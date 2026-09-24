import { db } from "@/server/db";
import { addStarterProducts } from "@/server/migrations/starter-products";

const ATTEMPTS = 5;
const RETRY_DELAY_MS = 15_000;

/**
 * تغييرات بيانات لمرة واحدة تُنفَّذ عند تشغيل الخادم بعد النشر (كل واحدة محمية بعلم
 * في الإعدادات فلا تتكرر). إن لم تكن قاعدة البيانات جاهزة بعد تُعاد المحاولة، وأي
 * فشل يُسجَّل فقط ولا يوقف تشغيل الموقع.
 */
export async function runStartupMigrations() {
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      await addStarterProducts(db);
      return;
    } catch (e) {
      const reason = e instanceof Error ? `${e.name}: ${e.message.trim().split("\n").pop()}` : String(e);
      console.error(`[migrations] attempt ${attempt}/${ATTEMPTS} failed — ${reason}`);
      if (attempt < ATTEMPTS) await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }
}
