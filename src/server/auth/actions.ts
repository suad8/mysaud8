"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { setSessionCookie, clearSessionCookie, getSession, requireOwner } from "@/server/auth/session";
import { AdminRole } from "@prisma/client";
import { logAudit } from "@/server/audit/log";
import { getClientIp } from "@/lib/request-ip";
import { createRateLimiter } from "@/lib/rate-limit";

export type LoginState = { error?: string; email?: string };

/**
 * حماية من تخمين كلمة المرور: حدّ للمحاولات الفاشلة لكل بريد (يحمي الحساب
 * المستهدف) وحدّ أوسع لكل IP (يمنع تجربة كلمة واحدة على بريدات كثيرة).
 */
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const failuresByEmail = createRateLimiter({ max: 5, windowMs: LOGIN_WINDOW_MS });
const failuresByIp = createRateLimiter({ max: 20, windowMs: LOGIN_WINDOW_MS });

const MIN_PASSWORD_LENGTH = 12;
const MAX_PASSWORD_LENGTH = 200;

/** تجزئة وهمية ثابتة — يُتحقَّق منها عند عدم وجود البريد حتى لا يكشف زمن الرد وجود الحساب. */
let dummyHash: Promise<string> | null = null;

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 200);
  const password = String(formData.get("password") ?? "").slice(0, MAX_PASSWORD_LENGTH);
  const next = String(formData.get("next") ?? "/admin");

  const ip = await getClientIp();
  const ipKey = ip ?? "unknown";
  if (failuresByEmail.isLimited(email) || failuresByIp.isLimited(ipKey)) {
    const minutes = Math.max(failuresByEmail.minutesLeft(email), failuresByIp.minutesLeft(ipKey));
    return { error: `محاولات دخول كثيرة فاشلة — حاول مرة أخرى بعد ${minutes} دقيقة`, email };
  }

  if (!email || !password) {
    return { error: "أدخل البريد الإلكتروني وكلمة المرور", email };
  }

  const user = await db.adminUser.findUnique({ where: { email } });
  dummyHash ??= hashPassword("dummy-password-for-timing");
  const validPassword = await verifyPassword(password, user?.passwordHash ?? (await dummyHash));
  const ok = Boolean(user?.isActive && validPassword);

  if (!ok) {
    failuresByEmail.hit(email);
    failuresByIp.hit(ipKey);
    const locked = failuresByEmail.isLimited(email) || failuresByIp.isLimited(ipKey);
    await logAudit({
      actorId: user?.id ?? null,
      action: locked ? "login.locked" : "login.failed",
      entity: "AdminUser",
      entityId: user?.id ?? null,
      diff: { email },
      ip,
    });
    return { error: "البريد الإلكتروني أو كلمة المرور غير صحيحة", email };
  }

  failuresByEmail.reset(email);
  await setSessionCookie(user!);
  await db.adminUser.update({ where: { id: user!.id }, data: { lastLoginAt: new Date() } });
  await logAudit({ actorId: user!.id, action: "login.success", entity: "AdminUser", entityId: user!.id, ip });

  // مسار داخلي فقط — يمنع إعادة التوجيه لموقع خارجي عبر معامل next
  redirect(/^\/admin(\/[\w\-/]*)?$/.test(next) ? next : "/admin");
}

export async function logoutAction() {
  const session = await getSession();
  if (session) {
    await logAudit({ actorId: session.sub, action: "logout", entity: "AdminUser", entityId: session.sub });
  }
  await clearSessionCookie();
  redirect("/admin/login");
}

export type ChangePasswordState = { error?: string; success?: boolean };

export async function changePasswordAction(
  _prevState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (next.length < MIN_PASSWORD_LENGTH) return { error: `كلمة المرور الجديدة يجب أن تكون ${MIN_PASSWORD_LENGTH} حرفاً على الأقل` };
  if (next.length > MAX_PASSWORD_LENGTH) return { error: "كلمة المرور طويلة جداً" };
  if (next !== confirm) return { error: "كلمتا المرور غير متطابقتين" };

  const user = await db.adminUser.findUnique({ where: { id: session.sub } });
  if (!user || !(await verifyPassword(current, user.passwordHash))) {
    return { error: "كلمة المرور الحالية غير صحيحة" };
  }

  const updated = await db.adminUser.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
  // تغيّر كلمة المرور يُبطل كل الجلسات المفتوحة (بأي جهاز) — نُصدر جلسة جديدة لهذا الجهاز فقط
  await setSessionCookie(updated);
  await logAudit({ actorId: session.sub, action: "password.changed", entity: "AdminUser", entityId: session.sub });
  return { success: true };
}

export type ManageUsersState = { error?: string; success?: boolean };

// إدارة المستخدمين محصورة بدور "مالك" (requireOwner) — يمنع موظفاً من منح نفسه صلاحيات أعلى.

export async function createAdminUserAction(
  _prevState: ManageUsersState,
  formData: FormData,
): Promise<ManageUsersState> {
  const owner = await requireOwner();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const roleRaw = String(formData.get("role") ?? "STAFF");
  const role = (Object.values(AdminRole) as string[]).includes(roleRaw) ? (roleRaw as AdminRole) : AdminRole.STAFF;

  if (!name) return { error: "الاسم مطلوب" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "البريد الإلكتروني غير صالح" };
  if (password.length < MIN_PASSWORD_LENGTH) return { error: `كلمة المرور يجب أن تكون ${MIN_PASSWORD_LENGTH} حرفاً على الأقل` };
  if (password.length > MAX_PASSWORD_LENGTH) return { error: "كلمة المرور طويلة جداً" };

  const existing = await db.adminUser.findUnique({ where: { email } });
  if (existing) return { error: "هذا البريد الإلكتروني مستخدم مسبقاً" };

  const created = await db.adminUser.create({
    data: { name, email, role, passwordHash: await hashPassword(password) },
  });
  await logAudit({ actorId: owner.sub, action: "adminUser.created", entity: "AdminUser", entityId: created.id, diff: { email, role } });

  revalidatePath("/admin/settings");
  return { success: true };
}

/** تفعيل/تعطيل حساب — مربوطة بمعرّف المستخدم عبر .bind، تستقبل FormData من <form>. */
export async function toggleAdminUserActiveAction(userId: string, _formData: FormData) {
  const session = await requireOwner();
  if (session.sub === userId) return; // لا يمكن للمالك تعطيل حسابه الخاص

  const target = await db.adminUser.findUnique({ where: { id: userId }, select: { isActive: true } });
  if (!target) return;

  await db.adminUser.update({ where: { id: userId }, data: { isActive: !target.isActive } });
  await logAudit({
    actorId: session.sub,
    action: "adminUser.toggled",
    entity: "AdminUser",
    entityId: userId,
    diff: { isActive: !target.isActive },
  });
  revalidatePath("/admin/settings");
}
