import { safeEqual, signServerValue } from "@/server/auth/session-token";
import { SITE_URL } from "@/lib/constants";

/**
 * رابط استعادة سلة متروكة (يُرسل للعميل في رسالة التذكير): يفتح السلة نفسها
 * على أي جهاز أو متصفح (مثل متصفح واتساب). موقّع بسر الخادم فلا يمكن تخمينه لسلال أخرى.
 */
export function cartRecoveryToken(cartId: string): string {
  return signServerValue("cart-recover", cartId).slice(0, 32);
}

export function verifyCartRecoveryToken(cartId: string, token: unknown): boolean {
  return typeof token === "string" && token.length === 32 && safeEqual(token, cartRecoveryToken(cartId));
}

export function cartRecoveryUrl(cartId: string): string {
  return `${SITE_URL}/cart/recover?c=${encodeURIComponent(cartId)}&t=${cartRecoveryToken(cartId)}`;
}
