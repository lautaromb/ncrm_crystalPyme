"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prismadb } from "@/lib/prisma";
import { getTenantContext, UnauthorizedError } from "@/lib/tenant";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

/** Convierte un string cualquiera a slug URL-safe. */
export function toSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // elimina diacríticos (á→a, ñ→n, etc.)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

const schema = z.object({
  agencyName: z.string().trim().min(2, "Mínimo 2 caracteres").max(80),
  agencySlug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Solo letras minúsculas, números y guiones"),
  businessName: z.string().trim().min(2, "Mínimo 2 caracteres").max(80),
  businessSlug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Solo letras minúsculas, números y guiones"),
  currency: z.enum(["ARS", "USD", "EUR", "BRL"]).default("ARS"),
  timezone: z.string().default("America/Argentina/Buenos_Aires"),
});

export type OnboardingInput = z.infer<typeof schema>;

export type OnboardingResult =
  | { ok: true; businessSlug: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

// ---------------------------------------------------------------------------
// Action
// ---------------------------------------------------------------------------

export async function completeOnboarding(
  input: OnboardingInput
): Promise<OnboardingResult> {
  // Requiere sesión activa
  let userId: string;
  let userEmail: string;
  try {
    const ctx = await getTenantContext();
    userId = ctx.userId;
    userEmail = ctx.email;
  } catch {
    throw new UnauthorizedError();
  }

  // Validación
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path.join(".");
      if (path && !fieldErrors[path]) fieldErrors[path] = issue.message;
    }
    return { ok: false, error: "Por favor corregí los campos marcados", fieldErrors };
  }

  const { agencyName, agencySlug, businessName, businessSlug, currency, timezone } =
    parsed.data;

  // Verificar unicidad de slugs
  const [existingAgency, existingBusiness] = await Promise.all([
    prismadb.agency.findUnique({ where: { slug: agencySlug }, select: { id: true } }),
    prismadb.business.findUnique({ where: { slug: businessSlug }, select: { id: true } }),
  ]);
  if (existingAgency) {
    return { ok: false, error: "Slug de agency no disponible", fieldErrors: { agencySlug: "Ya existe una agency con este slug" } };
  }
  if (existingBusiness) {
    return { ok: false, error: "Slug de business no disponible", fieldErrors: { businessSlug: "Ya existe un business con este slug" } };
  }

  // Obtener planes free para arrancar sin pago
  const [agencyPlan, businessPlan] = await Promise.all([
    prismadb.plan.findFirst({ where: { tier: "AGENCY", priceUSD: "0.00" }, orderBy: { sortOrder: "asc" } }),
    prismadb.plan.findFirst({ where: { tier: "BUSINESS", priceUSD: "0.00" }, orderBy: { sortOrder: "asc" } }),
  ]);

  if (!agencyPlan || !businessPlan) {
    return { ok: false, error: "Planes no configurados. Contactá al administrador." };
  }

  // Crear todo en una transacción
  try {
    await prismadb.$transaction(async (tx) => {
      // 1. Agency
      const agency = await tx.agency.create({
        data: {
          name: agencyName,
          slug: agencySlug,
          ownerId: userId,
          planId: agencyPlan.id,
          status: "ACTIVE",
          contactEmail: userEmail,
        },
      });

      // 2. AgencyMember (OWNER)
      await tx.agencyMember.create({
        data: {
          agencyId: agency.id,
          userId,
          role: "OWNER",
        },
      });

      // 3. Business
      const business = await tx.business.create({
        data: {
          name: businessName,
          slug: businessSlug,
          agencyId: agency.id,
          planId: businessPlan.id,
          status: "ACTIVE",
          email: userEmail,
          currency,
          timezone,
          locale: "es",
        },
      });

      // 4. BusinessMember (OWNER)
      await tx.businessMember.create({
        data: {
          businessId: business.id,
          userId,
          role: "OWNER",
        },
      });
    });

    return { ok: true, businessSlug };
  } catch (err) {
    console.error("[completeOnboarding]", err);
    return { ok: false, error: "Error al crear tu cuenta. Intentá de nuevo." };
  }
}
