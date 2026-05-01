import { getTenantContext } from "@/lib/tenant";
import { prismadb } from "@/lib/prisma";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ businessSlug: string; locale: string }>;
}

export default async function BusinessHomePage({ params }: Props) {
  const { businessSlug } = await params;
  const ctx = await getTenantContext();

  const business = await prismadb.business.findUnique({
    where: { slug: businessSlug },
    select: {
      id: true,
      name: true,
      status: true,
      _count: {
        select: {
          crmContacts: true,
          crmLeads: true,
          crmOpportunities: true,
        },
      },
    },
  });

  if (!business) notFound();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{business.name}</h1>
      <p className="text-muted-foreground">
        Workspace · {ctx.effectiveRole}
      </p>
      <div className="grid grid-cols-3 gap-4 max-w-lg">
        <div className="rounded-lg border p-4 text-center">
          <p className="text-3xl font-bold">{business._count.crmContacts}</p>
          <p className="text-sm text-muted-foreground">Contactos</p>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <p className="text-3xl font-bold">{business._count.crmLeads}</p>
          <p className="text-sm text-muted-foreground">Leads</p>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <p className="text-3xl font-bold">{business._count.crmOpportunities}</p>
          <p className="text-sm text-muted-foreground">Oportunidades</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground italic">
        TODO(phase-7): Dashboard con CRM, Kanban, Invoices, AI assistant.
      </p>
    </div>
  );
}
