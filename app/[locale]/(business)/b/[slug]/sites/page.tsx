import { getSession } from "@/lib/auth-server";
import { redirect } from "next/navigation";
import { prismadb } from "@/lib/prisma";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Globe, PenLine, Archive, ExternalLink } from "lucide-react";
import { TEMPLATES } from "@/lib/site-builder/templates";
import type { TemplateId } from "@/lib/site-builder/types";

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export default async function SitesPage({ params }: PageProps) {
  const { slug } = await params;

  const session = await getSession();
  if (!session?.user) redirect("/sign-in");

  const business = await prismadb.business.findUnique({
    where: { slug },
    select: { id: true, name: true },
  });
  if (!business) redirect("/");

  const sites = await prismadb.site.findMany({
    where: { businessId: business.id, status: { not: "ARCHIVED" } },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true, name: true, slug: true, templateId: true,
      status: true, publishedAt: true, updatedAt: true,
    },
  });

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Sitios web</h1>
          <p className="text-muted-foreground mt-1">
            Páginas de {business.name} visibles al público
          </p>
        </div>
        <Button asChild>
          <Link href={`/b/${slug}/sites/new`}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo sitio
          </Link>
        </Button>
      </div>

      {/* Empty state */}
      {sites.length === 0 && (
        <div className="border-2 border-dashed rounded-2xl p-16 text-center">
          <Globe className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Todavía no tenés ningún sitio</h3>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
            Creá tu primera página web en minutos con nuestras plantillas profesionales.
          </p>
          <Button asChild size="lg">
            <Link href={`/b/${slug}/sites/new`}>
              <Plus className="w-4 h-4 mr-2" />
              Crear mi primer sitio
            </Link>
          </Button>
        </div>
      )}

      {/* Sites grid */}
      {sites.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-4">
          {sites.map(site => {
            const tmpl = TEMPLATES[site.templateId as TemplateId];
            return (
              <div key={site.id}
                className="border rounded-2xl overflow-hidden bg-card hover:shadow-md transition-shadow">
                {/* Preview bar */}
                <div className={`h-28 bg-gradient-to-br ${tmpl?.meta.thumbnailGradient ?? "from-muted to-muted-foreground/20"} relative`}>
                  <div className="absolute inset-3 rounded-lg bg-white/10 border border-white/20" />
                  {site.status === "PUBLISHED" && (
                    <div className="absolute top-3 right-3">
                      <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-green-500 text-white">
                        <span className="w-1.5 h-1.5 rounded-full bg-white" />
                        En línea
                      </span>
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-bold truncate">{site.name}</h3>
                    <Badge variant="outline" className="text-xs flex-shrink-0">
                      {tmpl?.meta.category ?? site.templateId}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    /s/{site.slug}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button asChild size="sm" variant="outline" className="flex-1">
                      <Link href={`/b/${slug}/sites/${site.id}/edit`}>
                        <PenLine className="w-3.5 h-3.5 mr-1.5" />
                        Editar
                      </Link>
                    </Button>
                    {site.status === "PUBLISHED" && (
                      <Button asChild size="sm" variant="ghost">
                        <a href={`/s/${site.slug}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
