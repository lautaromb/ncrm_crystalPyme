"use server";

import { prismadb } from "@/lib/prisma";
import { requireBusinessContext } from "@/lib/tenant";
import { getTemplateDefaults, isValidTemplateId } from "@/lib/site-builder/templates";
import type { SiteContent, TemplateId } from "@/lib/site-builder/types";
import { z } from "zod";

// ---------------------------------------------------------------------------
// createSite
// ---------------------------------------------------------------------------

const createSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().min(2).max(60).regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones"),
  templateId: z.string(),
});

export async function createSite(input: z.infer<typeof createSchema>): Promise<{
  ok: boolean;
  siteId?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
}> {
  try {
    const { businessId } = await requireBusinessContext();

    const parsed = createSchema.safeParse(input);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as string;
        fieldErrors[field] = issue.message;
      }
      return { ok: false, error: "Datos inválidos", fieldErrors };
    }

    const { name, slug, templateId } = parsed.data;

    if (!isValidTemplateId(templateId)) {
      return { ok: false, error: `Template "${templateId}" no existe` };
    }

    // Verificar slug único
    const existing = await prismadb.site.findFirst({ where: { slug } });
    if (existing) {
      return { ok: false, error: "Esa URL ya está en uso", fieldErrors: { slug: "Esta URL ya está en uso" } };
    }

    // Obtener contenido por defecto del template y precargar el nombre del negocio
    const business = await prismadb.business.findUnique({
      where: { id: businessId },
      select: { name: true, phone: true, email: true },
    });

    const defaultContent = getTemplateDefaults(templateId as TemplateId, {
      brand: {
        name: business?.name ?? name,
        phone: business?.phone ?? "",
        email: business?.email ?? "",
      },
    });

    // Crear site + homepage en transacción
    const site = await prismadb.$transaction(async (tx) => {
      const s = await tx.site.create({
        data: {
          businessId,
          name,
          slug,
          templateId,
          themeConfig: defaultContent.colors as object,
          status: "DRAFT",
        },
      });

      await tx.sitePage.create({
        data: {
          siteId: s.id,
          path: "/",
          title: name,
          content: defaultContent as unknown as object,
          isHomepage: true,
          isPublished: false,
        },
      });

      return s;
    });

    return { ok: true, siteId: site.id };
  } catch (err) {
    console.error("[createSite]", err);
    return { ok: false, error: "Error al crear el sitio" };
  }
}

// ---------------------------------------------------------------------------
// updateSite — guarda el contenido editado
// ---------------------------------------------------------------------------

export async function updateSite(
  siteId: string,
  content: SiteContent
): Promise<{ ok: boolean; error?: string }> {
  try {
    const { businessId } = await requireBusinessContext();

    // Verificar que el site pertenece al business
    const site = await prismadb.site.findFirst({
      where: { id: siteId, businessId },
      include: { pages: { where: { isHomepage: true }, select: { id: true } } },
    });
    if (!site) return { ok: false, error: "Sitio no encontrado" };

    const homepage = site.pages[0];
    if (!homepage) return { ok: false, error: "Página de inicio no encontrada" };

    await prismadb.$transaction([
      // Actualizar contenido de la homepage
      prismadb.sitePage.update({
        where: { id: homepage.id },
        data: { content: content as unknown as object },
      }),
      // Actualizar themeConfig en Site para buscas rápidas
      prismadb.site.update({
        where: { id: siteId },
        data: { themeConfig: content.colors as object, updatedAt: new Date() },
      }),
    ]);

    return { ok: true };
  } catch (err) {
    console.error("[updateSite]", err);
    return { ok: false, error: "Error al guardar" };
  }
}

// ---------------------------------------------------------------------------
// publishSite
// ---------------------------------------------------------------------------

export async function publishSite(siteId: string): Promise<{ ok: boolean; error?: string; siteUrl?: string }> {
  try {
    const { businessId } = await requireBusinessContext();

    const site = await prismadb.site.findFirst({
      where: { id: siteId, businessId },
      include: { pages: { where: { isHomepage: true }, select: { id: true } } },
    });
    if (!site) return { ok: false, error: "Sitio no encontrado" };

    const homepage = site.pages[0];

    await prismadb.$transaction([
      prismadb.site.update({
        where: { id: siteId },
        data: { status: "PUBLISHED", publishedAt: new Date() },
      }),
      ...(homepage
        ? [prismadb.sitePage.update({
            where: { id: homepage.id },
            data: { isPublished: true },
          })]
        : []),
    ]);

    const siteUrl = `/s/${site.slug}`;
    return { ok: true, siteUrl };
  } catch (err) {
    console.error("[publishSite]", err);
    return { ok: false, error: "Error al publicar" };
  }
}

// ---------------------------------------------------------------------------
// deleteSite (soft delete via status)
// ---------------------------------------------------------------------------

export async function archiveSite(siteId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { businessId } = await requireBusinessContext();

    const site = await prismadb.site.findFirst({ where: { id: siteId, businessId } });
    if (!site) return { ok: false, error: "Sitio no encontrado" };

    await prismadb.site.update({
      where: { id: siteId },
      data: { status: "ARCHIVED" },
    });

    return { ok: true };
  } catch (err) {
    console.error("[archiveSite]", err);
    return { ok: false, error: "Error al archivar" };
  }
}
