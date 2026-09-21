"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/session";
import { logAudit } from "@/server/audit/log";
import { getClientIp } from "@/lib/request-ip";

export type ReviewFormState = { error?: string; success?: boolean };

/** حماية بسيطة من إغراق تقييمات وهمية متكررة — نفس نمط تحديد المعدّل بالجلسات الأخرى. */
const reviewAttempts = new Map<string, { count: number; windowStart: number }>();
const MAX_REVIEWS_PER_WINDOW = 5;
const WINDOW_MS = 10 * 60 * 1000;

export async function submitReviewAction(
  productSlug: string,
  _prevState: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  const ip = (await getClientIp()) ?? "unknown";
  const now = Date.now();
  const record = reviewAttempts.get(ip);
  if (record && now - record.windowStart < WINDOW_MS) {
    if (record.count >= MAX_REVIEWS_PER_WINDOW) {
      return { error: "عدد كبير من التقييمات خلال وقت قصير — يرجى المحاولة لاحقاً." };
    }
    record.count += 1;
  } else {
    reviewAttempts.set(ip, { count: 1, windowStart: now });
  }

  const authorName = String(formData.get("authorName") ?? "").trim();
  const rating = Math.round(Number(formData.get("rating") ?? "0"));
  const comment = String(formData.get("comment") ?? "").trim();

  if (!authorName) return { error: "الاسم مطلوب" };
  if (!rating || rating < 1 || rating > 5) return { error: "يرجى اختيار تقييم من 1 إلى 5 نجوم" };

  const product = await db.product.findUnique({ where: { slug: productSlug }, select: { id: true } });
  if (!product) return { error: "المنتج غير موجود" };

  await db.review.create({
    data: { productId: product.id, authorName, rating, comment: comment || null, isApproved: false },
  });

  revalidatePath(`/p/${productSlug}`);
  revalidatePath("/admin/reviews");
  return { success: true };
}

export async function approveReviewAction(reviewId: string, _formData: FormData) {
  const session = await requireAdmin();
  const review = await db.review.update({ where: { id: reviewId }, data: { isApproved: true }, include: { product: { select: { slug: true } } } });
  await logAudit({ actorId: session.sub, action: "review.approved", entity: "Review", entityId: reviewId });

  revalidatePath("/admin/reviews");
  revalidatePath(`/p/${review.product.slug}`);
}

export async function deleteReviewAction(reviewId: string, _formData: FormData) {
  const session = await requireAdmin();
  const review = await db.review.findUnique({ where: { id: reviewId }, include: { product: { select: { slug: true } } } });
  if (!review) return;

  await db.review.delete({ where: { id: reviewId } });
  await logAudit({ actorId: session.sub, action: "review.deleted", entity: "Review", entityId: reviewId });

  revalidatePath("/admin/reviews");
  revalidatePath(`/p/${review.product.slug}`);
}
