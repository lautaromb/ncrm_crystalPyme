/**
 * Matriz de permisos por rol efectivo.
 *
 * Reglas:
 *  - SUPERADMIN bypassa todo (no necesita figurar en cada permission).
 *  - Los permisos se nombran con dot-notation `<scope>.<resource>.<action>`.
 *  - Cada permission lista los roles que pueden ejecutarla. Si un rol no
 *    aparece, no tiene acceso.
 *
 * Uso desde server actions:
 *   await require("business.invoice.create")
 *   if (await can("business.invoice.viewAmounts")) { ... }
 */

import { ForbiddenError } from "./errors";
import type { EffectiveRole } from "./types";
import { getTenantContext } from "./context";

// ---------------------------------------------------------------------------
// Permission catalog
// ---------------------------------------------------------------------------

const ROLES_AGENCY_ALL = [
  "AGENCY_OWNER",
  "AGENCY_ADMIN",
  "AGENCY_STAFF",
] as const;
const ROLES_AGENCY_MANAGE = ["AGENCY_OWNER", "AGENCY_ADMIN"] as const;

const ROLES_BUSINESS_ALL = [
  "BUSINESS_OWNER",
  "BUSINESS_MANAGER",
  "BUSINESS_STAFF",
] as const;
const ROLES_BUSINESS_MANAGE = [
  "BUSINESS_OWNER",
  "BUSINESS_MANAGER",
] as const;

export const PERMISSIONS = {
  // PLATFORM ----------------------------------------------------------------
  "platform.agency.list":         ["SUPERADMIN"],
  "platform.agency.create":       ["SUPERADMIN"],
  "platform.agency.suspend":      ["SUPERADMIN"],
  "platform.plan.manage":         ["SUPERADMIN"],
  "platform.invoice.manage":      ["SUPERADMIN"],

  // AGENCY ------------------------------------------------------------------
  "agency.business.list":         [...ROLES_AGENCY_ALL],
  "agency.business.create":       [...ROLES_AGENCY_MANAGE],
  "agency.business.delete":       ["AGENCY_OWNER"],
  "agency.member.list":           [...ROLES_AGENCY_ALL],
  "agency.member.invite":         [...ROLES_AGENCY_MANAGE],
  "agency.member.remove":         ["AGENCY_OWNER"],
  "agency.billing.view":          [...ROLES_AGENCY_MANAGE],
  "agency.billing.pay":           ["AGENCY_OWNER"],
  "agency.metrics.view":          [...ROLES_AGENCY_ALL],
  "agency.settings.update":       [...ROLES_AGENCY_MANAGE],

  // BUSINESS — datos no sensibles (agency con acceso read-only) -------------
  "business.contact.list":        [...ROLES_AGENCY_ALL, ...ROLES_BUSINESS_ALL],
  "business.contact.view":        [...ROLES_AGENCY_ALL, ...ROLES_BUSINESS_ALL],
  "business.lead.list":           [...ROLES_AGENCY_ALL, ...ROLES_BUSINESS_ALL],
  "business.lead.view":           [...ROLES_AGENCY_ALL, ...ROLES_BUSINESS_ALL],
  "business.metrics.view":        [...ROLES_AGENCY_ALL, ...ROLES_BUSINESS_ALL],

  // BUSINESS — operacion (no agency, salvo gestion compartida) --------------
  "business.contact.create":      [...ROLES_BUSINESS_ALL],
  "business.contact.update":      [...ROLES_BUSINESS_ALL],
  "business.contact.delete":      [...ROLES_BUSINESS_MANAGE],
  "business.lead.create":         [...ROLES_BUSINESS_ALL],
  "business.lead.update":         [...ROLES_BUSINESS_ALL],
  "business.lead.delete":         [...ROLES_BUSINESS_MANAGE],
  "business.opportunity.manage":  [...ROLES_BUSINESS_MANAGE],

  // BUSINESS — finanzas (solo owner del business) ---------------------------
  "business.invoice.list":        [...ROLES_BUSINESS_MANAGE],
  "business.invoice.viewAmounts": ["BUSINESS_OWNER"],
  "business.invoice.create":      [...ROLES_BUSINESS_MANAGE],
  "business.invoice.send":        ["BUSINESS_OWNER"],
  "business.revenue.view":        ["BUSINESS_OWNER"],

  // BUSINESS — sites / forms / kanban ---------------------------------------
  "business.site.list":           [...ROLES_BUSINESS_ALL],
  "business.site.manage":         [...ROLES_BUSINESS_MANAGE],
  "business.site.publish":        ["BUSINESS_OWNER"],
  "business.form.manage":         [...ROLES_BUSINESS_MANAGE],
  "business.board.manage":        [...ROLES_BUSINESS_ALL],

  // BUSINESS — AI / Telegram ------------------------------------------------
  "business.ai.use":              [...ROLES_BUSINESS_MANAGE],
  "business.ai.configure":        ["BUSINESS_OWNER"],
  "business.telegram.configure":  ["BUSINESS_OWNER"],

  // BUSINESS — settings / members -------------------------------------------
  "business.member.list":         [...ROLES_BUSINESS_ALL],
  "business.member.invite":       [...ROLES_BUSINESS_MANAGE],
  "business.member.remove":       ["BUSINESS_OWNER"],
  "business.settings.update":     [...ROLES_BUSINESS_MANAGE],
  "business.settings.billing":    ["BUSINESS_OWNER"],
} as const satisfies Record<string, ReadonlyArray<EffectiveRole>>;

export type Permission = keyof typeof PERMISSIONS;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Chequea si el contexto actual tiene el permiso. No tira. */
export async function can(permission: Permission): Promise<boolean> {
  const ctx = await getTenantContext();
  if (ctx.isSuperadmin) return true;
  return (PERMISSIONS[permission] as ReadonlyArray<EffectiveRole>).includes(
    ctx.effectiveRole
  );
}

/** Tira ForbiddenError si el contexto no tiene el permiso. */
export async function require(permission: Permission): Promise<void> {
  if (!(await can(permission))) {
    throw new ForbiddenError(permission);
  }
}

/**
 * Variante sincronica para usar cuando ya tenes el ctx en mano
 * (evita un re-fetch de session/memberships).
 */
export function canWithRole(
  role: EffectiveRole,
  isSuperadmin: boolean,
  permission: Permission
): boolean {
  if (isSuperadmin) return true;
  return (PERMISSIONS[permission] as ReadonlyArray<EffectiveRole>).includes(role);
}
