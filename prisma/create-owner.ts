import { PrismaClient, AdminRole } from "@prisma/client";
import { hashPassword } from "../src/server/auth/password";

const db = new PrismaClient();

// سكربت آمن ومستقل لإنشاء/تصفير حساب المالك فقط — لا يلمس أي بيانات أخرى
// (منتجات، طلبات، عملاء...). يُستخدم عند تعذّر الدخول للوحة التحكم على
// بيئة (مثل الإنتاج على Railway) لم يُشغَّل عليها prisma/seed.ts من قبل،
// أو عند نسيان كلمة المرور. على عكس db:seed، لا يحذف أي كتالوج حقيقي.
const EMAIL = (process.env.OWNER_EMAIL ?? "saud09426@gmail.com").trim().toLowerCase();
const PASSWORD = process.env.OWNER_PASSWORD ?? "Fnjn-Coffee-2026!";
const RESET = process.env.RESET === "1";

async function main() {
  const existing = await db.adminUser.findUnique({ where: { email: EMAIL } });

  if (existing && !RESET) {
    console.log(`الحساب موجود مسبقاً: ${EMAIL}`);
    console.log("إن كانت المشكلة نسيان كلمة المرور، أعد تشغيل هذا الأمر مع RESET=1 لتصفيرها.");
    return;
  }

  const passwordHash = await hashPassword(PASSWORD);

  if (existing) {
    await db.adminUser.update({ where: { id: existing.id }, data: { passwordHash, role: AdminRole.OWNER } });
    console.log(`تم تصفير كلمة مرور الحساب: ${EMAIL}`);
  } else {
    await db.adminUser.create({
      data: { email: EMAIL, name: "مدير المتجر", role: AdminRole.OWNER, passwordHash },
    });
    console.log(`تم إنشاء حساب مالك جديد: ${EMAIL}`);
  }
  console.log("كلمة المرور المستخدمة هي قيمة OWNER_PASSWORD إن كانت مضبوطة، وإلا فالقيمة الافتراضية بالسكربت — غيّرها فوراً من الإعدادات بعد الدخول.");
}

main()
  .catch((e) => {
    console.error("فشل تنفيذ السكربت:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
