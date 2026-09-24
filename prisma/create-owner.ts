import { PrismaClient, AdminRole } from "@prisma/client";
import { hashPassword } from "../src/server/auth/password";

const db = new PrismaClient();

// سكربت آمن ومستقل لإنشاء/تصفير حساب المالك فقط — لا يلمس أي بيانات أخرى
// (منتجات، طلبات، عملاء...). يُستخدم عند تعذّر الدخول للوحة التحكم على
// بيئة (مثل الإنتاج على Railway) لم يُشغَّل عليها prisma/seed.ts من قبل،
// أو عند نسيان كلمة المرور. على عكس db:seed، لا يحذف أي كتالوج حقيقي.
//
// لا توجد كلمة مرور افتراضية بالكود (المستودع عام): يجب تمرير البريد وكلمة
// المرور عبر متغيرات البيئة، ولا يطبع السكربت كلمة المرور أبداً.
//   OWNER_EMAIL=you@example.com OWNER_PASSWORD='...' npm run db:create-owner
//   (أضف RESET=1 لتصفير كلمة مرور حساب موجود — يُنهي كل جلساته المفتوحة)
const EMAIL = (process.env.OWNER_EMAIL ?? "").trim().toLowerCase();
const PASSWORD = process.env.OWNER_PASSWORD ?? "";
const RESET = process.env.RESET === "1";
const MIN_PASSWORD_LENGTH = 12;

async function main() {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(EMAIL)) {
    console.error("⛔ مرّر بريد المالك عبر OWNER_EMAIL");
    process.exit(1);
  }
  if (PASSWORD.length < MIN_PASSWORD_LENGTH) {
    console.error(`⛔ مرّر كلمة مرور قوية (${MIN_PASSWORD_LENGTH} حرفاً على الأقل) عبر OWNER_PASSWORD`);
    process.exit(1);
  }

  const existing = await db.adminUser.findUnique({ where: { email: EMAIL } });

  if (existing && !RESET) {
    console.log(`الحساب موجود مسبقاً: ${EMAIL}`);
    console.log("إن كانت المشكلة نسيان كلمة المرور، أعد تشغيل هذا الأمر مع RESET=1 لتصفيرها.");
    return;
  }

  const passwordHash = await hashPassword(PASSWORD);

  if (existing) {
    await db.adminUser.update({
      where: { id: existing.id },
      // تغيّر كلمة المرور يُبطل تلقائياً أي جلسة مفتوحة بالقديمة (بصمة الجلسة)
      data: { passwordHash, role: AdminRole.OWNER, isActive: true },
    });
    console.log(`تم تصفير كلمة مرور الحساب: ${EMAIL} (وأُنهيت كل جلساته المفتوحة)`);
  } else {
    await db.adminUser.create({
      data: { email: EMAIL, name: "مدير المتجر", role: AdminRole.OWNER, passwordHash },
    });
    console.log(`تم إنشاء حساب مالك جديد: ${EMAIL}`);
  }
}

main()
  .catch((e) => {
    console.error("فشل تنفيذ السكربت:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
