import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { SiteEditor } from "@/components/site-builder/site-editor";
import { getTemplateDefaults, isValidTemplateId } from "@/lib/site-builder/templates";
import type { SiteContent, TemplateId } from "@/lib/site-builder/types";

interface PageProps {
  params: Promise<{ locale: string; slug: string; siteId: string }>;
}

export default async function EditSitePage({ params }: PageProps) {
  const { slug, siteId } = await params;

  const session = await getSession();
  if (!session?.user) redirect("/sign-in");

  // Cargar site + business
  const business = await prismadb.business.findUnique({
    where: { slug },
    select: { id: true, name: true },
  });
  if (!business) redirect("/");

  const site = await prismadb.site.findFirst({
    where: { id: siteId, businessId: business.id },
    include: {
      pages: { where: { isHomepage: true }, select: { id: true, content: true, isPublished: true } },
    },
  });
  if (!site) redirect(`/b/${slug}/sites`);

  // Deserializar contenido — si está vacío, usar defaults del template
  const rawTemplateId = site.templateId ?? "";
  const validId: TemplateId = isValidTemplateId(rawTemplateId) ? rawTemplateId : "autodrive";
  let content: SiteContent;

  const pageContent = site.pages[0]?.content;
  if (pageContent && typeof pageContent === "object" && Object.keys(pageContent).length > 0) {
    // Merge con defaults para garantizar que todos los campos existen
    content = getTemplateDefaults(validId, pageContent as Parameters<typeof getTemplateDefaults>[1]);
  } else {
    content = getTemplateDefaults(validId, { brand: { name: business.name } });
  }

  const isPublished = site.status === "PUBLISHED";

  return (
    <SiteEditor
      siteId={site.id}
      templateId={validId}
      initialContent={content}
      businessSlug={slug}
      isPublished={isPublished}
    />
  );
}
