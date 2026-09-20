"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { setSessionCookie, clearSessionCookie, getSession, requireAdmin } from "@/server/auth/session";
import { AdminRole } from "@prisma/client";

export type LoginState = { error?: string; email?: string };

/**
 * حماية بسيطة من تخمين كلمة المرور بالتكرار — بالذاكرة داخل نفس العملية.
 * ⚠️ تُصفَّر عند إعادة تشغيل الخادم، ولا تُشارك بين عدّة نسخ (instances)
 * إن وُسِّع التطبيق لاحقاً. كافية لخادم واحد؛ الأنسب لاحقاً نقلها لمخزن
 * مشترك (Redis) عند التوسّع.
 */
const attempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const LOCK_MS = 5 * 60 * 1000;

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");

  const key = email || "unknown";
  const record = attempts.get(key);
  if (record && record.lockedUntil > Date.now()) {
    const minutes = Math.ceil((record.lockedUntil - Date.now()) / 60_000);
    return { error: `محاولات دخول كثيرة فاشلة — حاول مرة أخرى بعد ${minutes} دقيقة`, email };
  }

  if (!email || !password) {
    return { error: "أدخل البريد الإلكتروني وكلمة المرور", email };
  }

  const user = await db.adminUser.findUnique({ where: { email } });
  const validPassword = user ? await verifyPassword(password, user.passwordHash) : false;
  const ok = Boolean(user?.isActive && validPassword);

  if (!ok) {
    const updated = { count: (record?.count ?? 0) + 1, lockedUntil: 0 };
    if (updated.count >= MAX_ATTEMPTS) updated.lockedUntil = Date.now() + LOCK_MS;
    attempts.set(key, updated);
    return { error: "البريد الإلكتروني أو كلمة المرور غير صحيحة", email };
  }

  attempts.delete(key);
  await setSessionCookie({ sub: user!.id, role: user!.role, name: user!.name });
  await db.adminUser.update({ where: { id: user!.id }, data: { lastLoginAt: new Date() } });

  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function logoutAction() {
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

  if (next.length < 8) return { error: "كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل" };
  if (next !== confirm) return { error: "كلمتا المرور غير متطابقتين" };

  const user = await db.adminUser.findUnique({ where: { id: session.sub } });
  if (!user || !(await verifyPassword(current, user.passwordHash))) {
    return { error: "كلمة المرور الحالية غير صحيحة" };
  }

  await db.adminUser.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next) } });
  return { success: true };
}

export type ManageUsersState = { error?: string; success?: boolean };

/** إدارة المستخدمين محصورة بدور "مالك" — يمنع موظفاً من منح نفسه صلاحيات أعلى. */
async function requireOwner() {
  const session = await requireAdmin();
  if (session.role !== AdminRole.OWNER) {
    throw new Error("هذا الإجراء متاح لحساب المالك فقط");
  }
  return session;
}

export async function createAdminUserAction(
  _prevState: ManageUsersState,
  formData: FormData,
): Promise<ManageUsersState> {
  await requireOwner();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const roleRaw = String(formData.get("role") ?? "STAFF");
  const role = (Object.values(AdminRole) as string[]).includes(roleRaw) ? (roleRaw as AdminRole) : AdminRole.STAFF;

  if (!name) return { error: "الاسم مطلوب" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "البريد الإلكتروني غير صالح" };
  if (password.length < 8) return { error: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" };

  const existing = await db.adminUser.findUnique({ where: { email } });
  if (existing) return { error: "هذا البريد الإلكتروني مستخدم مسبقاً" };

  await db.adminUser.create({
    data: { name, email, role, passwordHash: await hashPassword(password) },
  });

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
  revalidatePath("/admin/settings");
}
