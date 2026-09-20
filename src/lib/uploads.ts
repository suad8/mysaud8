import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

/**
 * تخزين الملفات المرفوعة (إيصالات تحويل بنكي، صور منتجات) محلياً على القرص.
 *
 * الرابط المُعاد يمرّ عبر src/app/api/uploads/[...path]/route.ts وليس
 * مباشرة عبر public/ — خادم next start يبني قائمة ملفات public/ عند
 * بدء التشغيل فقط، فأي ملف يُحفظ بعد ذلك يرجع 404 حتى تُعاد تشغيل
 * الخادم كاملاً. المسار الديناميكي يقرأ من القرص في كل طلب فيتجنّب هذا.
 *
 * ⚠️ هذا مناسب لخادم Node تقليدي بقرص دائم فقط. في الإنتاج على منصة
 * بلا نظام ملفات دائم (Vercel، إلخ) يجب استبدال هذا برفع إلى S3
 * (المتغيّرات جاهزة في .env.example: S3_ENDPOINT / S3_BUCKET...).
 */

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 ميغابايت

export class UploadError extends Error {}

export async function saveUploadedFile(file: File, subdir: string): Promise<string> {
  if (!file || file.size === 0) {
    throw new UploadError("لم يتم اختيار ملف");
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new UploadError("حجم الملف يتجاوز 5 ميغابايت");
  }
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    throw new UploadError("صيغة الملف غير مدعومة — الصيغ المقبولة: JPG, PNG, WEBP, PDF");
  }

  const dir = path.join(process.cwd(), "public", "uploads", subdir);
  await mkdir(dir, { recursive: true });

  const filename = `${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  return `/api/uploads/${subdir}/${filename}`;
}
