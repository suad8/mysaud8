"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { submitReviewAction } from "@/server/reviews/actions";

export function ReviewForm({ productSlug }: { productSlug: string }) {
  const action = submitReviewAction.bind(null, productSlug);
  const [state, formAction, isPending] = useActionState(action, {});
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);

  if (state.success) {
    return (
      <div className="surface-card p-5 text-center text-sm">
        <p className="font-semibold text-brand-700">شكراً لتقييمك!</p>
        <p className="mt-1 text-muted">سيظهر تقييمك بعد مراجعته من فريق المتجر.</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="surface-card space-y-4 p-5">
      <h3 className="text-sm font-semibold">أضف تقييمك</h3>

      {state.error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </div>
      )}

      <input type="hidden" name="rating" value={rating} />
      <div>
        <span className="mb-1.5 block text-sm font-medium text-muted">تقييمك</span>
        <div className="flex items-center gap-1" onMouseLeave={() => setHoverRating(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onMouseEnter={() => setHoverRating(n)}
              onClick={() => setRating(n)}
              aria-label={`${n} من 5`}
              className="p-0.5"
            >
              <svg
                width={24}
                height={24}
                viewBox="0 0 20 20"
                className={n <= (hoverRating || rating) ? "fill-amber-400" : "fill-ink-300 dark:fill-ink-700"}
              >
                <path d="M10 1.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.6 7.7l5.8-.8z" />
              </svg>
            </button>
          ))}
        </div>
      </div>

      <label className="block text-sm">
        <span className="mb-1.5 block font-medium text-muted">اسمك</span>
        <input
          name="authorName"
          required
          placeholder="مثال: سارة العتيبي"
          className="h-11 w-full rounded-xl border bg-transparent px-3.5 outline-none focus:ring-2 focus:ring-brand-500/40"
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1.5 block font-medium text-muted">تعليقك (اختياري)</span>
        <textarea
          name="comment"
          rows={3}
          placeholder="شاركنا رأيك بالمنتج"
          className="w-full rounded-xl border bg-transparent px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-brand-500/40"
        />
      </label>

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? "جارٍ الإرسال…" : "إرسال التقييم"}
        </Button>
      </div>
    </form>
  );
}
