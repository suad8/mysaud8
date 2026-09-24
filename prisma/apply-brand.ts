import { PrismaClient } from "@prisma/client";
import { applyBrand } from "./brand";

const db = new PrismaClient();

// يطبّق هوية "الورقة الذهبية" فقط — لا يحذف أي منتجات أو طلبات.
applyBrand(db)
  .then(() => console.log("تم تطبيق هوية الورقة الذهبية."))
  .catch((e) => {
    console.error("فشل التطبيق:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
