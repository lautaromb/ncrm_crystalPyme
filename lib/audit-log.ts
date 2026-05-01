// lib/audit-log.ts
import { getTenantContext, tenantPrisma } from "@/lib/tenant";

export type AuditEntityType =
  | "account"
  | "contact"
  | "lead"
  | "opportunity"
  | "contract"
  | "product"
  | "account_product"
  | "opportunity_line_item"
  | "contract_line_item";

export type AuditAction =
  | "created"
  | "updated"
  | "deleted"
  | "restored"
  | "relation_added"
  | "relation_removed"
  | "imported"
  | "cancelled";

export interface AuditChange {
  field: string;
  old: unknown;
  new: unknown;
}

const INTERNAL_FIELDS: Record<string, true> = {
  updatedAt: true, updatedBy: true, createdAt: true, createdBy: true,
  created_on: true, cratedAt: true, v: true, deletedAt: true, deletedBy: true,
};

export function diffObjects(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): AuditChange[] {
  const changes: AuditChange[] = [];
  const seen: Record<string, boolean> = {};

  const process = (key: string) => {
    if (seen[key] || INTERNAL_FIELDS[key]) return;
    seen[key] = true;
    const oldVal = before[key];
    const newVal = after[key];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({ field: key, old: oldVal ?? null, new: newVal ?? null });
    }
  };

  Object.keys(before).forEach(process);
  Object.keys(after).forEach(process);
  return changes;
}

interface WriteAuditLogParams {
  entityType: AuditEntityType;
  entityId: string;
  action: AuditAction;
  changes?: AuditChange[] | null;
  userId: string | null;
}

/**
 * Escribe una entrada de audit log en el contexto del business activo.
 *
 * Lee `businessId` desde el TenantContext (cacheado per-request), de modo que
 * los callers no tienen que pasarlo explicitamente. Si el contexto activo no
 * es BUSINESS, la escritura se omite silenciosamente (los audit logs son por
 * business — un superadmin operando a nivel platform no genera audit del CRM).
 *
 * Nunca tira: una falla del audit no debe bloquear la mutacion principal.
 */
export async function writeAuditLog(params: WriteAuditLogParams): Promise<void> {
  try {
    const ctx = await getTenantContext();
    if (ctx.activeContext.type !== "BUSINESS" || !ctx.activeContext.id) {
      // Fuera de un business no hay scope para audit del CRM.
      return;
    }
    const businessId = ctx.activeContext.id;
    const db = tenantPrisma(businessId);
    await db.crm_AuditLog.create({
      data: {
        businessId,
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        changes: params.changes ?? undefined,
        userId: params.userId ?? undefined,
      },
    });
  } catch (err) {
    console.error("[AUDIT_LOG_WRITE_FAILED]", err);
    // Never rethrow — audit failures must not block CRM mutations
  }
}
