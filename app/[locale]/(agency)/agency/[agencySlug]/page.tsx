import { getTenantContext } from "@/lib/tenant";
import { prismadb } from "@/lib/prisma";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ agencySlug: string; locale: string }>;
}

export default async function AgencyHomePage({ params }: Props) {
  const { agencySlug } = await params;
  const ctx = await getTenantContext();

  const agency = await prismadb.agency.findUnique({
    where: { slug: agencySlug },
    select: {
      id: true,
      name: true,
      status: true,
      _count: { select: { businesses: true, members: true } },
    },
  });

  if (!agency) notFound();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{agency.name}</h1>
      <p className="text-muted-foreground">
        Portal de agency · {ctx.effectiveRole}
      </p>
      <div className="grid grid-cols-2 gap-4 max-w-sm">
        <div className="rounded-lg border p-4 text-center">
          <p className="text-3xl font-bold">{agency._count.businesses}</p>
          <p className="text-sm text-muted-foreground">Businesses</p>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <p className="text-3xl font-bold">{agency._count.members}</p>
          <p className="text-sm text-muted-foreground">Miembros</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground italic">
        TODO(phase-7): Dashboard de agency con métricas de businesses, billing y gestión de equipo.
      </p>
    </div>
  );
}
