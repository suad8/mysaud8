import { getSession } from "@/server/auth/session";
import { getMaintenanceSettings } from "@/server/settings";

/** هل المتجر مغلق لهذا الزائر؟ (وضع الصيانة مفعّل وليس مديراً مسجّلاً دخوله) */
export async function isStoreClosedForVisitor(): Promise<boolean> {
  const maintenance = await getMaintenanceSettings();
  if (!maintenance.enabled) return false;
  return !(await getSession());
}
