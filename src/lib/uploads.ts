import { writeFile, mkdir, unlink } from "node:fs/promises";
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

/**
 * يتحقق من "التوقيع المغناطيسي" (magic bytes) الفعلي لمحتوى الملف بدل
 * الوثوق بـ File.type المُعلَن من المتصفح فقط — حقل يسهل تزويره (يمكن
 * لأي عميل إرسال ملف تنفيذي مع ترويسة Content-Type مزيّفة تدّعي أنه صورة).
 */
function detectRealType(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
    buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  if (buffer.length >= 5 && buffer.toString("ascii", 0, 5) === "%PDF-") {
    return "application/pdf";
  }
  return null;
}

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

  const buffer = Buffer.from(await file.arrayBuffer());
  const realType = detectRealType(buffer);
  if (!realType || realType !== file.type) {
    throw new UploadError("محتوى الملف لا يطابق نوعه المُعلَن — يرجى رفع ملف سليم");
  }

  const dir = path.join(process.cwd(), "public", "uploads", subdir);
  await mkdir(dir, { recursive: true });

  const filename = `${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
  await writeFile(path.join(dir, filename), buffer);

  return `/api/uploads/${subdir}/${filename}`;
}

/** يحذف ملفاً رُفع بـ saveUploadedFile (مثلاً عند فشل إنشاء الطلب بعد حفظ الإيصال). لا يرمي أخطاء. */
export async function deleteUploadedFile(url: string): Promise<void> {
  const match = /^\/api\/uploads\/([a-z-]+)\/(\d+-[a-f0-9]+\.[a-z]+)$/.exec(url);
  if (!match) return;
  await unlink(path.join(process.cwd(), "public", "uploads", match[1]!, match[2]!)).catch(() => {});
}

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/** يقرأ صورة مرفوعة ويتحقق من نوعها الحقيقي دون حفظها (مثل شعار يُرسل للذكاء الاصطناعي). */
export async function readValidatedImage(file: File): Promise<{ buffer: Buffer; mimeType: string }> {
  if (!file || file.size === 0) throw new UploadError("لم يتم اختيار ملف");
  if (file.size > MAX_SIZE_BYTES) throw new UploadError("حجم الملف يتجاوز 5 ميغابايت");
  const buffer = Buffer.from(await file.arrayBuffer());
  const realType = detectRealType(buffer);
  if (!realType || !IMAGE_TYPES.has(realType)) throw new UploadError("يرجى رفع صورة JPG أو PNG أو WEBP");
  return { buffer, mimeType: realType };
}

/** يحفظ صورة JPEG مولَّدة على الخادم (بعد التحقق من توقيعها) ويعيد رابطها. */
export async function saveJpegBuffer(buffer: Buffer, subdir: string): Promise<string> {
  if (detectRealType(buffer) !== "image/jpeg") throw new UploadError("صورة غير صالحة");
  const dir = path.join(process.cwd(), "public", "uploads", subdir);
  await mkdir(dir, { recursive: true });
  const filename = `${Date.now()}-${randomUUID().slice(0, 8)}.jpg`;
  await writeFile(path.join(dir, filename), buffer);
  return `/api/uploads/${subdir}/${filename}`;
}
