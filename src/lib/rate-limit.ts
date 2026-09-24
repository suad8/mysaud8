/**
 * محدِّد معدّل بنافذة زمنية ثابتة — بالذاكرة داخل نفس العملية.
 * ⚠️ يُصفَّر عند إعادة تشغيل الخادم ولا يُشارك بين عدّة نسخ (instances)؛
 * كافٍ لخادم واحد، والأنسب نقله لمخزن مشترك (Redis) عند التوسّع.
 * عدد المفاتيح محدود (maxKeys) حتى لا يُستنزَف الذاكرة بمفاتيح عشوائية.
 */
type Bucket = { count: number; windowStart: number };

export function createRateLimiter({ max, windowMs, maxKeys = 10_000 }: { max: number; windowMs: number; maxKeys?: number }) {
  const buckets = new Map<string, Bucket>();

  function active(key: string, now: number): Bucket | null {
    const b = buckets.get(key);
    if (!b) return null;
    if (now - b.windowStart >= windowMs) {
      buckets.delete(key);
      return null;
    }
    return b;
  }

  function makeRoom(now: number) {
    if (buckets.size < maxKeys) return;
    for (const [k, b] of buckets) if (now - b.windowStart >= windowMs) buckets.delete(k);
    // لا يزال ممتلئاً بمفاتيح نشطة: احذف الأقدم (ترتيب الإدراج)
    while (buckets.size >= maxKeys) {
      const oldest = buckets.keys().next().value;
      if (oldest === undefined) break;
      buckets.delete(oldest);
    }
  }

  return {
    /** يسجّل محاولة؛ يعيد false إن كان المفتاح قد بلغ الحد (ولا تُحتسب المحاولة). */
    hit(key: string): boolean {
      const now = Date.now();
      const b = active(key, now);
      if (!b) {
        makeRoom(now);
        buckets.set(key, { count: 1, windowStart: now });
        return true;
      }
      if (b.count >= max) return false;
      b.count += 1;
      return true;
    },
    /** هل المفتاح محظور الآن؟ دون تسجيل محاولة. */
    isLimited(key: string): boolean {
      const b = active(key, Date.now());
      return Boolean(b && b.count >= max);
    },
    /** الدقائق المتبقية حتى رفع الحظر. */
    minutesLeft(key: string): number {
      const b = active(key, Date.now());
      return b ? Math.max(1, Math.ceil((b.windowStart + windowMs - Date.now()) / 60_000)) : 0;
    },
    reset(key: string) {
      buckets.delete(key);
    },
  };
}
