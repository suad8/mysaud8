import { PrismaClient } from "@prisma/client";

// في التطوير يعيد Next.js تحميل الوحدات عند كل تعديل، فنحتفظ بالعميل
// على الكائن العام حتى لا تتراكم اتصالات قاعدة البيانات.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
