/**
 * Tipos compartidos de la capa de tenancy.
 */

import type { AgencyRole, BusinessRole } from "@prisma/client";

export type ContextType = "PLATFORM" | "AGENCY" | "BUSINESS";

/** Rol efectivo del usuario en el contexto activo. */
export type EffectiveRole =
  | "SUPERADMIN"
  | `AGENCY_${AgencyRole}`
  | `BUSINESS_${BusinessRole}`;

export interface AgencyMembershipRef {
  agencyId: string;
  agencySlug: string;
  agencyName: string;
  role: AgencyRole;
}

export interface BusinessMembershipRef {
  businessId: string;
  businessSlug: string;
  businessName: string;
  agencyId: string;
  role: BusinessRole;
}

export interface ActiveContext {
  type: ContextType;
  /** id del Agency o Business activo. null cuando type=PLATFORM. */
  id: string | null;
}

export interface TenantContext {
  userId: string;
  email: string;
  isSuperadmin: boolean;
  agencyMemberships: AgencyMembershipRef[];
  businessMemberships: BusinessMembershipRef[];
  activeContext: ActiveContext;
  /** Rol efectivo derivado de activeContext (helper). */
  effectiveRole: EffectiveRole;
}
