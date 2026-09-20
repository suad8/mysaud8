import { NextResponse } from "next/server";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

/**
 * يخدّم الملفات المرفوعة وقت التشغيل (إيصالات التحويل، صور المنتجات)
 * بقراءة حيّة من القرص في كل طلب.
 *
 * ⚠️ لا تُستخدَم هنا خدمة public/ الثابتة من Next.js عمداً: خادم الإنتاج
 * (`next start`) يبني قائمة ملفات public/ عند بدء التشغيل فقط، فأي ملف
 * يُرفع بعد ذلك يرجع 404 حتى يُعاد تشغيل الخادم بالكامل. هذا المسار
 * الديناميكي يقرأ من القرص مباشرة في كل طلب فيعمل دائماً بلا إعادة تشغيل.
 */

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

const UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads");

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;

  if (!segments?.length || segments.some((s) => s === ".." || s === "." || s.includes("/"))) {
    return new NextResponse("غير موجود", { status: 404 });
  }

  const filePath = path.join(UPLOADS_ROOT, ...segments);
  // تأكيد أن المسار النهائي لا يزال داخل مجلد الرفع (منع الخروج خارج الحدود)
  if (!filePath.startsWith(UPLOADS_ROOT + path.sep)) {
    return new NextResponse("غير موجود", { status: 404 });
  }

  try {
    const info = await stat(filePath);
    if (!info.isFile()) return new NextResponse("غير موجود", { status: 404 });

    const buffer = await readFile(filePath);
    const contentType = MIME[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("غير موجود", { status: 404 });
  }
}
