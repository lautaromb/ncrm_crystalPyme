/**
 * Tenancy public API.
 *
 * Importar siempre desde `@/lib/tenant`, no desde los modulos internos.
 */

export {
  TenantError,
  UnauthorizedError,
  ForbiddenError,
  TenantRequiredError,
  TenantNotFoundError,
  TenantSuspendedError,
  QuotaExceededError,
  type TenantErrorCode,
} from "./errors";

export {
  getTenantContext,
  requireBusinessContext,
  requireAgencyContext,
  requireSuperadmin,
  assertBusinessAccess,
  TENANT_CONTEXT_HEADER,
  TENANT_CONTEXT_COOKIE,
} from "./context";

export {
  PERMISSIONS,
  can,
  require as requirePermission,
  canWithRole,
  type Permission,
} from "./permissions";

export {
  tenantPrisma,
  TENANT_MODELS,
  type TenantPrismaClient,
} from "./prisma-tenant";

// switch-workspace solo se importa desde Client Components
// export * from "./switch-workspace"  ← no exportar aquí (es "use client")

export type {
  ActiveContext,
  ContextType,
  EffectiveRole,
  AgencyMembershipRef,
  BusinessMembershipRef,
  TenantContext,
} from "./types";
