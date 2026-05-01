/**
 * Prisma client extendido con enforcement automatico de `businessId`.
 *
 * Filosofia: en vez de exigir que cada query del CRM filtre por
 * `businessId` manualmente (riesgoso, repetitivo), envolvemos `prismadb`
 * en un Prisma extension que:
 *
 *  - Inyecta `where.businessId` en lecturas y bulk update/delete.
 *  - Inyecta `data.businessId` en escrituras (create/createMany/upsert).
 *  - Valida cross-tenant antes de update/delete por id.
 *  - Valida que el resultado de findUnique pertenezca al business activo
 *    (Prisma no permite filtrar findUnique por campos no-unicos).
 *
 * Implementacion: en Prisma 7, los hooks `create`/`createMany`/`upsert`
 * solo existen a nivel per-model (no en `$allModels`). Por eso construimos
 * el query extension iterando sobre `TENANT_MODELS` y agregando los
 * hooks de escritura individualmente, mas un `$allOperations` global
 * para lecturas/updates/deletes.
 *
 * Uso:
 *   const db = tenantPrisma(businessId)
 *   await db.crm_Contacts.findMany()
 *   await db.crm_Contacts.create({ data: { ... } })
 *
 * Para queries de sistema (auth, tenancy resolution, jobs cross-tenant)
 * seguir usando `prismadb` directo.
 */

import { prismadb } from "@/lib/prisma";
import { ForbiddenError } from "./errors";

// ---------------------------------------------------------------------------
// Modelos tenant-scoped
// ---------------------------------------------------------------------------

/**
 * Lista de nombres de modelos Prisma que tienen el campo `businessId`.
 * Mantener sincronizado con el schema. Si agregas un modelo tenant nuevo,
 * agregalo aca.
 */
export const TENANT_MODELS = [
  "crm_Accounts",
  "crm_Leads",
  "crm_Opportunities",
  "crm_Contacts",
  "crm_Contracts",
  "crm_Activities",
  "crm_Targets",
  "crm_TargetLists",
  "crm_Products",
  "crm_AccountProducts",
  "crm_campaigns",
  "crm_campaign_templates",
  "crm_AuditLog",
  "crm_Report_Config",
  "crm_Report_Schedule",
  "Documents",
  "Boards",
  "Tasks",
  "Email",
  "EmailAccount",
  "Invoices",
  "Invoice_Series",
  "Invoice_Settings",
  // SaaS-native (siempre bajo Business):
  "Site",
  "Form",
  "AIUsageLog",
  "TelegramContact",
] as const;

const TENANT_MODELS_SET = new Set<string>(TENANT_MODELS);

const READ_OPS = new Set([
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
]);
const BULK_WRITE_OPS = new Set([
  "updateMany",
  "deleteMany",
  "updateManyAndReturn",
]);
const SINGLE_WRITE_OPS = new Set(["update", "delete"]);
const FIND_UNIQUE_OPS = new Set(["findUnique", "findUniqueOrThrow"]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type AnyArgs = Record<string, unknown>;

function injectWhere(args: AnyArgs, businessId: string): AnyArgs {
  const where = (args.where as AnyArgs | undefined) ?? {};
  return { ...args, where: { ...where, businessId } };
}

function injectData(args: AnyArgs, businessId: string): AnyArgs {
  const data = args.data;
  if (Array.isArray(data)) {
    return {
      ...args,
      data: data.map((d) => ({ ...(d as AnyArgs), businessId })),
    };
  }
  return {
    ...args,
    data: { ...((data as AnyArgs) ?? {}), businessId },
  };
}

function isTenantModel(model: string | undefined): model is string {
  return !!model && TENANT_MODELS_SET.has(model);
}

async function assertOwnedRecord(
  model: string,
  id: string,
  businessId: string
): Promise<void> {
  // Acceso dinamico: el nombre de modelo ya fue validado contra TENANT_MODELS.
  const client = prismadb as unknown as Record<
    string,
    { findUnique: (args: unknown) => Promise<{ businessId?: string } | null> }
  >;
  const existing = await client[model].findUnique({
    where: { id },
    select: { businessId: true },
  });
  if (existing && existing.businessId !== businessId) {
    throw new ForbiddenError(`${model}.crossTenant`);
  }
}

// ---------------------------------------------------------------------------
// Per-model write hooks (create/createMany/upsert)
// ---------------------------------------------------------------------------

type WriteHook = (params: {
  args: AnyArgs;
  query: (args: AnyArgs) => Promise<unknown>;
}) => Promise<unknown>;

function buildWriteHooks(businessId: string) {
  const create: WriteHook = ({ args, query }) =>
    query(injectData(args, businessId));

  const createMany: WriteHook = ({ args, query }) =>
    query(injectData(args, businessId));

  const createManyAndReturn: WriteHook = ({ args, query }) =>
    query(injectData(args, businessId));

  const upsert =
    (model: string): WriteHook =>
    async ({ args, query }) => {
      const id = (args.where as { id?: string } | undefined)?.id;
      if (id) await assertOwnedRecord(model, id, businessId);
      const next: AnyArgs = {
        ...args,
        create: {
          ...((args.create as AnyArgs | undefined) ?? {}),
          businessId,
        },
      };
      return query(next);
    };

  const perModel: Record<string, Record<string, WriteHook>> = {};
  for (const model of TENANT_MODELS) {
    perModel[model] = {
      create,
      createMany,
      createManyAndReturn,
      upsert: upsert(model),
    };
  }
  return perModel;
}

// ---------------------------------------------------------------------------
// Extension factory
// ---------------------------------------------------------------------------

/**
 * Devuelve un cliente Prisma extendido que filtra/inyecta `businessId`
 * automaticamente para todos los modelos tenant-scoped.
 *
 * @param businessId UUID del Business activo. La validacion de existencia
 *                   y permisos ya fue hecha por el caller (ej.
 *                   `requireBusinessContext`).
 */
export function tenantPrisma(businessId: string) {
  if (!businessId || typeof businessId !== "string") {
    throw new ForbiddenError("tenant.prisma.invalidBusinessId");
  }

  const writeHooksByModel = buildWriteHooks(businessId);

  // El query extension acepta tanto `$allModels` como claves per-modelo.
  // Combinamos ambos: $allModels para reads/updates/deletes, per-modelo
  // para create/createMany/upsert (Prisma 7 no los expone en $allModels).
  const queryExtension: Record<string, unknown> = {
    $allModels: {
      async $allOperations({
        model,
        operation,
        args,
        query,
      }: {
        model: string;
        operation: string;
        args: AnyArgs;
        query: (args: AnyArgs) => Promise<unknown>;
      }) {
        if (!isTenantModel(model)) return query(args);

        if (READ_OPS.has(operation) || BULK_WRITE_OPS.has(operation)) {
          return query(injectWhere(args, businessId));
        }

        if (SINGLE_WRITE_OPS.has(operation)) {
          const id = (args.where as { id?: string } | undefined)?.id;
          if (id) await assertOwnedRecord(model, id, businessId);
          return query(args);
        }

        if (FIND_UNIQUE_OPS.has(operation)) {
          const result = (await query(args)) as
            | { businessId?: string | null }
            | null;
          if (
            result &&
            "businessId" in result &&
            result.businessId !== businessId
          ) {
            if (operation === "findUniqueOrThrow") {
              throw new ForbiddenError(`${model}.crossTenant`);
            }
            return null;
          }
          return result;
        }

        return query(args);
      },
    },
    ...writeHooksByModel,
  };

  return prismadb.$extends({
    name: "tenant-isolation",
    // Cast: el shape dinamico no encaja en los tipos generados de Prisma,
    // pero los nombres de modelo y operacion son validos en runtime.
    query: queryExtension as never,
  });
}

export type TenantPrismaClient = ReturnType<typeof tenantPrisma>;
