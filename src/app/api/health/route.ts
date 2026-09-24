import { NextResponse } from "next/server";
import { db } from "@/server/db";

export const dynamic = "force-dynamic";

/**
 * فحص صحة للنشر (Railway healthcheck): يرد 200 فقط إن كان الخادم يعمل
 * وقاعدة البيانات تستجيب — وإلا 503 فلا يُحوَّل الزوار لنسخة معطوبة.
 * لا يكشف أي تفاصيل عن الخطأ أو البيئة.
 */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ status: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
