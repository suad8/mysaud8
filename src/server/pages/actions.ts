"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/session";
import { logAudit } from "@/server/audit/log";
import { slugify, uniqueSlug } from "@/lib/slug";

export type PageFormState = { error?: string; success?: boolean };

const MAX_CONTENT = 50_000;

/**
 * الصفحات الأساسية التي تشير لها روابط الفوتر الافتراضية — تُنشأ كمسودات بنص
 * مبدئي مناسب لمتجر طباعة، ليراجعه المتجر ويكمل ما بين [ ] ثم ينشره.
 */
const DEFAULT_PAGES: { slug: string; title: string; content: string }[] = [
  {
    slug: "about",
    title: "من نحن",
    content: `نحن متجر متخصص في حلول الطباعة الاحترافية للأفراد والشركات: كروت العمل، المطبوعات التجارية، الملصقات، التغليف، والطباعة حسب الطلب.

نؤمن أن كل مطبوعة تمثّل هوية صاحبها، لذلك نهتم بجودة الخامات ودقة الألوان وسرعة التنفيذ.

[أضف هنا نبذة عن الشركة وخبرتها وما يميّزها]`,
  },
  {
    slug: "shipping",
    title: "الشحن والتوصيل",
    content: `نشحن طلباتنا إلى جميع مدن المملكة العربية السعودية.

مدة التنفيذ: تبدأ طباعة الطلب بعد تأكيد الدفع واعتماد التصميم، وتستغرق عادةً [عدد] أيام عمل حسب نوع المطبوعة والكمية.

مدة التوصيل: يصل الطلب بعد الشحن خلال [عدد] أيام عمل حسب المدينة.

تكلفة الشحن: تظهر بدقة في صفحة الدفع قبل تأكيد الطلب.

تتبّع الطلب: نرسل لك رقم التتبّع فور شحن طلبك.`,
  },
  {
    slug: "returns",
    title: "سياسة الاستبدال والإرجاع",
    content: `نحرص على وصول مطبوعاتك بأعلى جودة. ولأن أغلب منتجاتنا تُطبع حسب طلب العميل وتصميمه، تسري السياسة التالية:

المنتجات المطبوعة حسب الطلب: لا يمكن إرجاعها أو استبدالها بعد اعتماد التصميم وبدء الطباعة، إلا عند وجود عيب في الطباعة أو خطأ من جهتنا.

العيوب وأخطاء الطباعة: إن وصلك الطلب بعيب أو باختلاف عن التصميم المعتمد، تواصل معنا خلال [عدد] أيام من الاستلام مع صور توضّح المشكلة، وسنعيد الطباعة أو نسترد المبلغ.

المنتجات غير المخصّصة: يمكن إرجاعها خلال [عدد] أيام من الاستلام بحالتها الأصلية وغير مستخدمة.

الاسترداد: يُعاد المبلغ بطريقة الدفع نفسها خلال [عدد] أيام عمل من قبول الطلب.`,
  },
  {
    slug: "privacy",
    title: "سياسة الخصوصية",
    content: `نحترم خصوصيتك ونلتزم بحماية بياناتك الشخصية وفق نظام حماية البيانات الشخصية في المملكة العربية السعودية.

البيانات التي نجمعها: الاسم، رقم الجوال، البريد الإلكتروني، عنوان التوصيل، والملفات والتصاميم التي ترفعها لتنفيذ طلبك.

استخدام البيانات: لتنفيذ طلبك وتوصيله والتواصل معك بشأنه فقط. لا نبيع بياناتك ولا نشاركها إلا مع شركات الشحن بالقدر اللازم للتوصيل.

ملفاتك وتصاميمك: تُحفظ بشكل خاص ولا يطّلع عليها إلا فريق المتجر لغرض تنفيذ الطلب.

حقوقك: يمكنك طلب الاطلاع على بياناتك أو تصحيحها أو حذفها بالتواصل معنا.`,
  },
  {
    slug: "terms",
    title: "الشروط والأحكام",
    content: `باستخدامك لهذا المتجر وإتمامك للطلب فإنك توافق على الشروط التالية:

الأسعار: جميع الأسعار بالريال السعودي وتشمل ضريبة القيمة المضافة 15%.

التصاميم والملفات: يتحمّل العميل مسؤولية صحة البيانات والنصوص في التصميم المرفوع، وحقوق استخدام الشعارات والصور الواردة فيه.

اعتماد التصميم: تبدأ الطباعة بعد اعتماد العميل للتصميم، ولا يمكن تعديل الطلب بعد بدء الطباعة.

الألوان: قد تظهر فروقات بسيطة في الألوان بين الشاشة والمطبوعة الفعلية، ولا يُعد ذلك عيباً.

[أضف أي شروط أخرى خاصة بمتجرك]`,
  },
  {
    slug: "contact",
    title: "تواصل معنا",
    content: `يسعدنا تواصلك معنا لأي استفسار أو طلب خاص.

الجوال / واتساب: [رقم الجوال]
البريد الإلكتروني: [البريد الإلكتروني]
العنوان: [المدينة، الحي]
أوقات العمل: [مثال: من الأحد إلى الخميس، 9 صباحاً – 6 مساءً]`,
  },
];

function revalidatePages(slug?: string) {
  revalidatePath("/admin/pages");
  if (slug) revalidatePath(`/pages/${slug}`);
}

export async function createPageAction(formData: FormData) {
  const session = await requireAdmin();
  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  if (!title) return;

  const requested = String(formData.get("slug") ?? "").trim();
  const slug = await uniqueSlug(slugify(requested || title, "page"), async (s) =>
    Boolean(await db.page.findUnique({ where: { slug: s }, select: { id: true } })),
  );
  const page = await db.page.create({ data: { title, slug, content: "", isPublished: false } });
  await logAudit({ actorId: session.sub, action: "page.created", entity: "Page", entityId: page.id, diff: { title, slug } });
  revalidatePages();
  redirect(`/admin/pages/${page.id}`);
}

export async function createDefaultPagesAction(_formData: FormData) {
  const session = await requireAdmin();
  const existing = new Map((await db.page.findMany({ select: { slug: true, content: true } })).map((p) => [p.slug, p.content]));
  const missing = DEFAULT_PAGES.filter((p) => !existing.has(p.slug));
  // صفحات أساسية أُنشئت سابقاً فارغة: تُعبّأ بالنص المبدئي (لا يُمس أي محتوى كتبه المتجر)
  const empty = DEFAULT_PAGES.filter((p) => existing.has(p.slug) && !existing.get(p.slug)!.trim());
  if (missing.length === 0 && empty.length === 0) return;

  await db.$transaction([
    db.page.createMany({ data: missing.map((p) => ({ slug: p.slug, title: p.title, content: p.content, isPublished: false })) }),
    ...empty.map((p) => db.page.update({ where: { slug: p.slug }, data: { content: p.content } })),
  ]);
  await logAudit({
    actorId: session.sub,
    action: "page.defaultsCreated",
    entity: "Page",
    diff: { created: missing.map((p) => p.slug), filled: empty.map((p) => p.slug) },
  });
  revalidatePages();
}

export async function updatePageAction(pageId: string, _prev: PageFormState, formData: FormData): Promise<PageFormState> {
  const session = await requireAdmin();
  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  if (!title) return { error: "عنوان الصفحة مطلوب" };

  const content = String(formData.get("content") ?? "").replace(/\r\n/g, "\n").slice(0, MAX_CONTENT);
  const isPublished = formData.get("isPublished") === "on";
  if (isPublished && !content.trim()) return { error: "لا يمكن نشر صفحة فارغة — اكتب محتواها أولاً" };

  const current = await db.page.findUnique({ where: { id: pageId }, select: { slug: true } });
  if (!current) return { error: "الصفحة غير موجودة" };

  const requestedSlug = slugify(String(formData.get("slug") ?? "").trim() || title, "page");
  let slug = current.slug;
  if (requestedSlug !== current.slug) {
    const taken = await db.page.findUnique({ where: { slug: requestedSlug }, select: { id: true } });
    if (taken) return { error: "هذا الرابط مستخدم لصفحة أخرى" };
    slug = requestedSlug;
  }

  await db.page.update({ where: { id: pageId }, data: { title, slug, content, isPublished } });
  await logAudit({ actorId: session.sub, action: "page.updated", entity: "Page", entityId: pageId, diff: { title, slug, isPublished } });
  revalidatePages(current.slug);
  if (slug !== current.slug) revalidatePages(slug);
  revalidatePath("/sitemap.xml");
  return { success: true };
}

export async function deletePageAction(pageId: string, _formData: FormData) {
  const session = await requireAdmin();
  const page = await db.page.findUnique({ where: { id: pageId }, select: { slug: true } });
  if (!page) return;
  await db.page.delete({ where: { id: pageId } });
  await logAudit({ actorId: session.sub, action: "page.deleted", entity: "Page", entityId: pageId, diff: { slug: page.slug } });
  revalidatePages(page.slug);
  redirect("/admin/pages");
}
