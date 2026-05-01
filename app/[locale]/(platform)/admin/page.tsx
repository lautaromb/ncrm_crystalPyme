import { getTenantContext } from "@/lib/tenant";

export default async function PlatformAdminPage() {
  const ctx = await getTenantContext();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Platform Admin</h1>
      <p className="text-muted-foreground">
        Bienvenido, {ctx.email}. Este es el panel de superadmin de CrystalPyme.
      </p>
      <div className="rounded-lg border p-4 bg-muted/20 text-sm space-y-1">
        <p><span className="font-medium">Rol efectivo:</span> {ctx.effectiveRole}</p>
        <p><span className="font-medium">Agencies:</span> {ctx.agencyMemberships.length}</p>
        <p><span className="font-medium">Businesses:</span> {ctx.businessMemberships.length}</p>
      </div>
      <p className="text-xs text-muted-foreground italic">
        TODO(phase-7): Dashboard de métricas globales, gestión de agencies, plans y facturación.
      </p>
    </div>
  );
}
