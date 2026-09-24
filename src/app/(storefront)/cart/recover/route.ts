import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/server/db";
import { setCartSessionCookie } from "@/server/cart/session";
import { verifyCartRecoveryToken } from "@/server/cart/recover";

/** يفتح السلة المتروكة من رابط التذكير ثم يحوّل لصفحة السلة. رابط غير صالح = صفحة السلة العادية. */
export async function GET(req: NextRequest) {
  const cartId = req.nextUrl.searchParams.get("c") ?? "";
  const token = req.nextUrl.searchParams.get("t");
  const target = new URL("/cart", req.url);

  if (cartId.length > 0 && cartId.length <= 40 && verifyCartRecoveryToken(cartId, token)) {
    const cart = await db.cart.findUnique({ where: { id: cartId }, select: { sessionId: true, status: true } });
    if (cart?.sessionId && cart.status === "ACTIVE") await setCartSessionCookie(cart.sessionId);
  }
  return NextResponse.redirect(target, { status: 303, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
