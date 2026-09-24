import Link from "next/link";
import { notFound } from "next/navigation";
import { Topbar } from "@/components/admin/Topbar";
import { PageForm } from "@/components/admin/PageForm";
import { ConfirmSubmitButton } from "@/components/admin/ConfirmSubmitButton";
import { db } from "@/server/db";
import { deletePageAction, updatePageAction } from "@/server/pages/actions";
import { requireAdminPage } from "@/server/auth/session";

type Props = { params: Promise<{ id: string }> };

export default async function EditPagePage({ params }: Props) {
  await requireAdminPage();
  const { id } = await params;
  const page = await db.page.findUnique({ where: { id } });
  if (!page) notFound();

  return (
    <>
      <Topbar
        title={page.title}
        subtitle="تعديل صفحة"
        actions={
          <div className="flex items-center gap-3">
            {page.isPublished && (
              <Link href={`/pages/${page.slug}`} target="_blank" className="text-xs font-medium text-brand-700 hover:underline">عرض في المتجر ↗</Link>
            )}
            <form action={deletePageAction.bind(null, page.id)}>
              <ConfirmSubmitButton type="submit" variant="danger" size="sm" confirmMessage={`حذف صفحة "${page.title}" نهائياً؟`}>
                حذف
              </ConfirmSubmitButton>
            </form>
          </div>
        }
      />
      <div className="p-5 lg:p-8">
        <section className="surface-card p-5">
          <PageForm
            action={updatePageAction.bind(null, page.id)}
            initial={{ title: page.title, slug: page.slug, content: page.content, isPublished: page.isPublished }}
          />
        </section>
      </div>
    </>
  );
}
