import { db } from "@/server/db";

export type AuditInput = {
  actorId: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  diff?: Record<string, unknown>;
  ip?: string | null;
};

/**
 * يسجّل حدثاً في سجل النشاطات (AuditLog). يبتلع أي خطأ عمداً — تسجيل
 * التدقيق ثانوي ولا يجب أبداً أن يُسقط العملية الأصلية (إنشاء منتج،
 * تأكيد دفعة...) بسبب فشل الكتابة في سجل التدقيق نفسه.
 */
export async function logAudit(input: AuditInput): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        actorId: input.actorId,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        diff: input.diff as never,
        ip: input.ip ?? null,
      },
    });
  } catch {
    // تجاهل مقصود — انظر التعليق أعلاه
  }
}
