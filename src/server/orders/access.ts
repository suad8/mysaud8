import { safeEqual, signServerValue } from "@/server/auth/session-token";

/**
 * رمز سري لرابط صفحة تأكيد الطلب: أرقام الطلبات متسلسلة (FJ-1001، FJ-1002…)،
 * فبدون الرمز يستطيع أي شخص تصفّح طلبات كل العملاء بتغيير الرقم.
 */
export function orderAccessToken(orderNumber: string): string {
  return signServerValue("order-access", orderNumber).slice(0, 32);
}

export function verifyOrderAccessToken(orderNumber: string, token: unknown): boolean {
  return typeof token === "string" && token.length === 32 && safeEqual(token, orderAccessToken(orderNumber));
}
