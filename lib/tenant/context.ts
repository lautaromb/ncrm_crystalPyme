/**
 * Resolver de contexto de tenancy.
 *
 * Combina la session de Better Auth con las membresias en DB y resuelve
 * el "contexto activo" (Platform | Agency | Business) que el usuario esta
 * usando en este momento.
 *
 * El contexto activo se determina, en orden de precedencia:
 *  1. Header `x-tenant-context` seteado por middleware (formato:
 *     `PLATFORM`, `AGENCY:<id>`, `BUSINESS:<id>`).
 *  2. Cookie `tenant-context` (si el user cambio de workspace via UI).
 *  3. Fallback automatico (superadmin -> PLATFORM; caso contrario, primer
 *     business o primer agency disponible).
 */

import { headers, cookies } from "next/headers";
import { cache } from "react";

import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";

import {
  ForbiddenError,
  TenantNotFoundError,
  TenantRequiredError,
  UnauthorizedError,
} from "./errors";
import type {
  ActiveContext,
  AgencyMembershipRef,
  BusinessMembershipRef,
  ContextType,
  EffectiveRole,
  TenantContext,
} from "./types";

const CONTEXT_HEADER = "x-tenant-context";
const CONTEXT_COOKIE = "tenant-context";

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

/**
 * Parsea el string de contexto emitido por middleware o cookie.
 *
 * Formatos reconocidos:
 *   PLATFORM
 *   AGENCY:<id|slug>
 *   BUSINESS:<id|slug>
 *   SUBDOMAIN:<slug>      → el middleware no sabe si es agency o business;
 *                           lo resolvemos en resolveActiveContext()
 *   CUSTOM_DOMAIN:<host>  → phase 11 (site builder con dominio propio)
 */
function parseContextString(raw: string | null | undefined): ActiveContext | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (trimmed === "PLATFORM") {
    return { type: "PLATFORM", id: null };
  }
  const colonIdx = trimmed.indexOf(":");
  if (colonIdx === -1) return null;
  const type = trimmed.slice(0, colonIdx);
  const id = trimmed.slice(colonIdx + 1);
  if (!id) return null;

  if (type === "AGENCY" || type === "BUSINESS") {
    return { type, id };
  }
  // SUBDOMAIN y CUSTOM_DOMAIN: los pasamos como BUSINESS con id especial
  // para que resolveActiveContext los trate en su lógica de slug.
  if (type === "SUBDOMAIN") {
    return { type: "SUBDOMAIN" as never, id };
  }
  return null;
}

async function readContextHint(): Promise<ActiveContext | null> {
  const h = await headers();
  const fromHeader = parseContextString(h.get(CONTEXT_HEADER));
  if (fromHeader) return fromHeader;

  const c = await cookies();
  return parseContextString(c.get(CONTEXT_COOKIE)?.value);
}

// ---------------------------------------------------------------------------
// Membership loading
// ---------------------------------------------------------------------------

async function loadMemberships(userId: string): Promise<{
  agencies: AgencyMembershipRef[];
  businesses: BusinessMembershipRef[];
}> {
  const [agencyRows, businessRows] = await Promise.all([
    prismadb.agencyMember.findMany({
      where: { userId },
      include: {
        agency: { select: { id: true, slug: true, name: true, deletedAt: true } },
      },
    }),
    prismadb.businessMember.findMany({
      where: { userId },
      include: {
        business: {
          select: {
            id: true,
            slug: true,
            name: true,
            agencyId: true,
            deletedAt: true,
          },
        },
      },
    }),
  ]);

  const agencies = agencyRows
    .filter((m) => !m.agency.deletedAt)
    .map<AgencyMembershipRef>((m) => ({
      agencyId: m.agency.id,
      agencySlug: m.agency.slug,
      agencyName: m.agency.name,
      role: m.role,
    }));

  const businesses = businessRows
    .filter((m) => !m.business.deletedAt)
    .map<BusinessMembershipRef>((m) => ({
      businessId: m.business.id,
      businessSlug: m.business.slug,
      businessName: m.business.name,
      agencyId: m.business.agencyId,
      role: m.role,
    }));

  return { agencies, businesses };
}

// ---------------------------------------------------------------------------
// Active context resolution
// ---------------------------------------------------------------------------

function resolveActiveContext(args: {
  hint: ActiveContext | null;
  isSuperadmin: boolean;
  agencies: AgencyMembershipRef[];
  businesses: BusinessMembershipRef[];
}): ActiveContext {
  const { hint, isSuperadmin, agencies, businesses } = args;

  // Hint validation: el user debe tener acceso al tenant solicitado.
  // El `id` del hint puede ser un UUID o un slug (el middleware pasa slugs
  // para evitar DB lookups en Edge). Normalizamos a UUID si encontramos match.
  if (hint) {
    if (hint.type === "PLATFORM" && isSuperadmin) return hint;

    if (hint.type === "AGENCY") {
      const match = agencies.find(
        (a) => a.agencyId === hint.id || a.agencySlug === hint.id
      );
      if (match) return { type: "AGENCY", id: match.agencyId };
    }

    if (hint.type === "BUSINESS") {
      const match = businesses.find(
        (b) => b.businessId === hint.id || b.businessSlug === hint.id
      );
      if (match) return { type: "BUSINESS", id: match.businessId };
    }

    // SUBDOMAIN: buscar el slug en agencies primero, luego businesses.
    if ((hint.type as string) === "SUBDOMAIN") {
      const agencyMatch = agencies.find((a) => a.agencySlug === hint.id);
      if (agencyMatch) return { type: "AGENCY", id: agencyMatch.agencyId };
      const bizMatch = businesses.find((b) => b.businessSlug === hint.id);
      if (bizMatch) return { type: "BUSINESS", id: bizMatch.businessId };
    }

    // Hint invalido (slug no encontrado en memberships): caemos al fallback.
  }

  if (isSuperadmin) return { type: "PLATFORM", id: null };
  if (businesses.length > 0) {
    return { type: "BUSINESS", id: businesses[0].businessId };
  }
  if (agencies.length > 0) {
    return { type: "AGENCY", id: agencies[0].agencyId };
  }
  // Sin tenants: forzamos PLATFORM con id null. Las acciones que requieran
  // tenant van a fallar con TenantRequiredError aguas abajo.
  return { type: "PLATFORM", id: null };
}

function computeEffectiveRole(
  active: ActiveContext,
  isSuperadmin: boolean,
  agencies: AgencyMembershipRef[],
  businesses: BusinessMembershipRef[]
): EffectiveRole {
  if (isSuperadmin && active.type === "PLATFORM") return "SUPERADMIN";

  if (active.type === "AGENCY") {
    const m = agencies.find((a) => a.agencyId === active.id);
    if (m) return `AGENCY_${m.role}` as EffectiveRole;
  }
  if (active.type === "BUSINESS") {
    const m = businesses.find((b) => b.businessId === active.id);
    if (m) return `BUSINESS_${m.role}` as EffectiveRole;
  }
  // Fallback inseguro: tratamos como STAFF de business para minimizar privilegios.
  // Las acciones criticas igual deben pasar por `require()`.
  return "BUSINESS_STAFF";
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Devuelve el TenantContext del request actual.
 *
 * Cacheado per-request via `react.cache` para evitar multiples roundtrips
 * a la DB en el mismo render/server action.
 */
export const getTenantContext = cache(async (): Promise<TenantContext> => {
  const session = await getSession();
  if (!session?.user) throw new UnauthorizedError();

  const userRow = await prismadb.users.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, isSuperadmin: true },
  });
  if (!userRow) throw new UnauthorizedError("User not found");

  const { agencies, businesses } = await loadMemberships(userRow.id);
  const hint = await readContextHint();
  const activeContext = resolveActiveContext({
    hint,
    isSuperadmin: userRow.isSuperadmin,
    agencies,
    businesses,
  });
  const effectiveRole = computeEffectiveRole(
    activeContext,
    userRow.isSuperadmin,
    agencies,
    businesses
  );

  return {
    userId: userRow.id,
    email: userRow.email,
    isSuperadmin: userRow.isSuperadmin,
    agencyMemberships: agencies,
    businessMemberships: businesses,
    activeContext,
    effectiveRole,
  };
});

// ---------------------------------------------------------------------------
// Guards: usar al inicio de cada server action / API route
// ---------------------------------------------------------------------------

/**
 * Garantiza que el contexto activo sea Business y devuelve el id + rol.
 * Tira `TenantRequiredError` si el usuario no esta en un Business.
 */
export async function requireBusinessContext(): Promise<{
  ctx: TenantContext;
  businessId: string;
  role: BusinessMembershipRef["role"];
}> {
  const ctx = await getTenantContext();
  if (ctx.activeContext.type !== "BUSINESS" || !ctx.activeContext.id) {
    throw new TenantRequiredError("BUSINESS");
  }
  const businessId = ctx.activeContext.id;
  const membership = ctx.businessMemberships.find(
    (m) => m.businessId === businessId
  );
  if (!membership) {
    // El user perdio acceso al business pero el contexto activo no se actualizo.
    throw new ForbiddenError("business.access");
  }
  return { ctx, businessId, role: membership.role };
}

/**
 * Garantiza que el contexto activo sea Agency.
 */
export async function requireAgencyContext(): Promise<{
  ctx: TenantContext;
  agencyId: string;
  role: AgencyMembershipRef["role"];
}> {
  const ctx = await getTenantContext();
  if (ctx.activeContext.type !== "AGENCY" || !ctx.activeContext.id) {
    throw new TenantRequiredError("AGENCY");
  }
  const agencyId = ctx.activeContext.id;
  const membership = ctx.agencyMemberships.find((m) => m.agencyId === agencyId);
  if (!membership) throw new ForbiddenError("agency.access");
  return { ctx, agencyId, role: membership.role };
}

/**
 * Garantiza que el usuario sea superadmin.
 */
export async function requireSuperadmin(): Promise<TenantContext> {
  const ctx = await getTenantContext();
  if (!ctx.isSuperadmin) throw new ForbiddenError("platform.superadmin");
  return ctx;
}

/**
 * Verifica que el usuario tenga acceso a un Business especifico
 * (independiente del contexto activo). Util para acciones cross-business.
 */
export async function assertBusinessAccess(
  businessId: string
): Promise<{ ctx: TenantContext; role: BusinessMembershipRef["role"] }> {
  const ctx = await getTenantContext();
  if (ctx.isSuperadmin) {
    const exists = await prismadb.business.findUnique({
      where: { id: businessId },
      select: { id: true },
    });
    if (!exists) throw new TenantNotFoundError("BUSINESS", businessId);
    return { ctx, role: "OWNER" };
  }
  const membership = ctx.businessMemberships.find(
    (m) => m.businessId === businessId
  );
  if (!membership) throw new ForbiddenError("business.access");
  return { ctx, role: membership.role };
}

// Constants exportadas para usar en middleware / cliente.
export const TENANT_CONTEXT_HEADER = CONTEXT_HEADER;
export const TENANT_CONTEXT_COOKIE = CONTEXT_COOKIE;
