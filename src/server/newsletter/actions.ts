"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/session";
import { logAudit } from "@/server/audit/log";
import { getClientIp } from "@/lib/request-ip";

export type NewsletterState = { error?: string; success?: boolean };

const attempts = new Map<string, { count: number; windowStart: number }>();
const MAX_PER_WINDOW = 5;
const WINDOW_MS = 10 * 60 * 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function subscribeNewsletterAction(_prev: NewsletterState, formData: FormData): Promise<NewsletterState> {
  const ip = (await getClientIp()) ?? "unknown";
  const now = Date.now();
  const record = attempts.get(ip);
  if (record && now - record.windowStart < WINDOW_MS) {
    if (record.count >= MAX_PER_WINDOW) return { error: "محاولات كثيرة — حاول لاحقاً." };
    record.count += 1;
  } else {
    attempts.set(ip, { count: 1, windowStart: now });
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL_PATTERN.test(email) || email.length > 200) return { error: "يرجى إدخال بريد إلكتروني صحيح" };

  // upsert: الاشتراك مرتين بنفس البريد لا يُظهر خطأ ولا يكشف إن كان مشتركاً مسبقاً
  await db.newsletterSubscriber.upsert({ where: { email }, create: { email }, update: {} });
  revalidatePath("/admin/theme");
  return { success: true };
}

export async function deleteSubscriberAction(id: string, _formData: FormData) {
  const session = await requireAdmin();
  await db.newsletterSubscriber.deleteMany({ where: { id } });
  await logAudit({ actorId: session.sub, action: "newsletter.subscriberDeleted", entity: "NewsletterSubscriber", entityId: id });
  revalidatePath("/admin/theme");
}
