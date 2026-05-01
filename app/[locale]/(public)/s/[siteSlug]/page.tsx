/**
 * app/[locale]/(public)/s/[siteSlug]/page.tsx
 *
 * Render público del sitio web de un business.
 * No requiere sesión — ruta pública en PUBLIC_PATHS del middleware.
 *
 * URL: /s/<siteSlug>
 */

import { notFound } from "next/navigation";
import { prismadb } from "@/lib/prisma";
import { SiteRenderer } from "@/components/site-builder/site-renderer";
import { getTemplateDefaults, isValidTemplateId } from "@/lib/site-builder/templates";
import type { SiteContent, TemplateId } from "@/lib/site-builder/types";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ locale: string; siteSlug: string }>;
}

// ---------------------------------------------------------------------------
// Metadata dinámica
// ---------------------------------------------------------------------------
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { siteSlug } = await params;

  const site = await prismadb.site.findFirst({
    where: { slug: siteSlug },
    select: { name: true, seoTitle: true, seoDescription: true, ogImageUrl: true },
  });

  if (!site) return { title: "Página no encontrada" };

  return {
    title: site.seoTitle ?? site.name,
    description: site.seoDescription ?? undefined,
    openGraph: site.ogImageUrl ? { images: [site.ogImageUrl] } : undefined,
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default async function PublicSitePage({ params }: PageProps) {
  const { siteSlug } = await params;

  // Buscar site publicado
  const site = await prismadb.site.findFirst({
    where: { slug: siteSlug },
    include: {
      pages: { where: { isHomepage: true, isPublished: true }, select: { content: true } },
    },
  });

  if (!site || site.status !== "PUBLISHED") notFound();

  const pageContent = site.pages[0]?.content;
  const rawTplId = site.templateId ?? "";
  const templateId: TemplateId = isValidTemplateId(rawTplId) ? rawTplId : "autodrive";

  let content: SiteContent;
  if (pageContent && typeof pageContent === "object" && Object.keys(pageContent).length > 0) {
    content = getTemplateDefaults(templateId, pageContent as Partial<SiteContent>);
  } else {
    content = getTemplateDefaults(templateId);
  }

  return <SiteRenderer templateId={templateId} content={content} />;
}
