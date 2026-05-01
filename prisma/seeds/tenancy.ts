/**
 * Seed: SaaS multi-tenant layer.
 *
 * Crea los Plans default, una Agency "demo" propiedad del primer admin
 * encontrado, y un Business "demo" bajo esa agency. Ademas pobla
 * `businessId` en los modelos del CRM existentes que aun lo tengan en NULL,
 * para que el sistema quede consistente antes de la migracion a NOT NULL
 * (Fase 4).
 *
 * Idempotente: se puede correr multiples veces sin duplicar datos.
 */

import type { PrismaClient } from "@prisma/client";

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

const PLAN_DEFINITIONS = [
  // Agency tier ---------------------------------------------------------------
  {
    slug: "agency-free",
    name: "Agency Free",
    description: "Plan gratuito con 30 dias de prueba para empezar.",
    tier: "AGENCY" as const,
    billingPeriod: "MONTHLY" as const,
    priceUSD: "0.00",
    priceARS: "0.00",
    maxBusinesses: 2,
    maxMembers: 1,
    trialDays: 30,
    routingTier: "PATH" as const,
    features: { branding: false, telegram: false, customDomain: false },
    sortOrder: 10,
  },
  {
    slug: "agency-starter",
    name: "Agency Starter",
    description: "Plan inicial para profesionales independientes.",
    tier: "AGENCY" as const,
    billingPeriod: "MONTHLY" as const,
    priceUSD: "35.00",
    priceARS: "35000.00",
    maxBusinesses: 10,
    maxMembers: 3,
    trialDays: 30,
    routingTier: "SUBDOMAIN" as const,
    features: { branding: true, telegram: true, customDomain: false },
    sortOrder: 20,
  },
  {
    slug: "agency-pro",
    name: "Agency Pro",
    description: "Para agencias en crecimiento con multiples clientes.",
    tier: "AGENCY" as const,
    billingPeriod: "MONTHLY" as const,
    priceUSD: "75.00",
    priceARS: "75000.00",
    maxBusinesses: 50,
    maxMembers: 10,
    trialDays: 14,
    routingTier: "CUSTOM_DOMAIN" as const,
    features: { branding: true, telegram: true, customDomain: true },
    sortOrder: 30,
  },

  // Business tier -------------------------------------------------------------
  {
    slug: "business-free",
    name: "Business Free",
    description: "Plan gratuito para que el negocio pruebe la herramienta.",
    tier: "BUSINESS" as const,
    billingPeriod: "MONTHLY" as const,
    priceUSD: "0.00",
    priceARS: "0.00",
    maxContacts: 100,
    maxAIImagesMonthly: 0,
    maxAITokensMonthly: 0,
    maxStorageMB: 100,
    trialDays: 30,
    routingTier: "PATH" as const,
    features: { ecommerce: false, telegram: false, customDomain: false },
    sortOrder: 10,
  },
  {
    slug: "business-starter",
    name: "Business Starter",
    description: "Plan basico con CRM, Kanban y forms.",
    tier: "BUSINESS" as const,
    billingPeriod: "MONTHLY" as const,
    priceUSD: "25.00",
    priceARS: "25000.00",
    maxContacts: 1000,
    maxAIImagesMonthly: 10,
    maxAITokensMonthly: 100_000,
    maxStorageMB: 1024,
    trialDays: 14,
    routingTier: "SUBDOMAIN" as const,
    features: { ecommerce: false, telegram: true, customDomain: false },
    sortOrder: 20,
  },
  {
    slug: "business-pro",
    name: "Business Pro",
    description: "Plan completo con ecommerce y dominio propio.",
    tier: "BUSINESS" as const,
    billingPeriod: "MONTHLY" as const,
    priceUSD: "45.00",
    priceARS: "45000.00",
    maxContacts: 5000,
    maxAIImagesMonthly: 50,
    maxAITokensMonthly: 500_000,
    maxStorageMB: 5120,
    trialDays: 14,
    routingTier: "CUSTOM_DOMAIN" as const,
    features: { ecommerce: true, telegram: true, customDomain: true },
    sortOrder: 30,
  },
];

async function seedPlans(prisma: PrismaClient) {
  for (const plan of PLAN_DEFINITIONS) {
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: plan,
      create: plan,
    });
  }
  console.log(`Plans seeded: ${PLAN_DEFINITIONS.length}`);
}

// ---------------------------------------------------------------------------
// Demo Agency + Business
// ---------------------------------------------------------------------------

async function seedDemoTenant(prisma: PrismaClient) {
  // Necesitamos un User dueno. Buscamos el admin actual (primer is_admin=true),
  // o el TEST_USER_EMAIL como fallback.
  const ownerCandidate =
    (await prisma.users.findFirst({
      where: { is_admin: true },
      orderBy: { created_on: "asc" },
    })) ??
    (await prisma.users.findFirst({
      where: { email: process.env.TEST_USER_EMAIL ?? "test@nextcrm.app" },
    }));

  if (!ownerCandidate) {
    console.warn(
      "Demo tenant skipped: no admin user found. Run user seed first."
    );
    return null;
  }

  // Marcar el primer admin como superadmin de la plataforma
  if (!ownerCandidate.isSuperadmin) {
    await prisma.users.update({
      where: { id: ownerCandidate.id },
      data: { isSuperadmin: true },
    });
    console.log(`Superadmin set: ${ownerCandidate.email}`);
  }

  const agencyPlan = await prisma.plan.findUniqueOrThrow({
    where: { slug: "agency-starter" },
  });
  const businessPlan = await prisma.plan.findUniqueOrThrow({
    where: { slug: "business-starter" },
  });

  const agency = await prisma.agency.upsert({
    where: { slug: "demo-agency" },
    update: {
      planId: agencyPlan.id,
      ownerId: ownerCandidate.id,
    },
    create: {
      name: "Demo Agency",
      slug: "demo-agency",
      ownerId: ownerCandidate.id,
      planId: agencyPlan.id,
      status: "ACTIVE",
      contactEmail: ownerCandidate.email,
    },
  });

  // Membership del owner como AgencyMember (OWNER)
  await prisma.agencyMember.upsert({
    where: { agencyId_userId: { agencyId: agency.id, userId: ownerCandidate.id } },
    update: { role: "OWNER" },
    create: {
      agencyId: agency.id,
      userId: ownerCandidate.id,
      role: "OWNER",
    },
  });

  const business = await prisma.business.upsert({
    where: { slug: "demo-business" },
    update: {
      agencyId: agency.id,
      planId: businessPlan.id,
    },
    create: {
      name: "Demo Business",
      slug: "demo-business",
      agencyId: agency.id,
      planId: businessPlan.id,
      status: "ACTIVE",
      email: ownerCandidate.email,
      timezone: "America/Argentina/Buenos_Aires",
      locale: "es",
      currency: "ARS",
    },
  });

  await prisma.businessMember.upsert({
    where: {
      businessId_userId: { businessId: business.id, userId: ownerCandidate.id },
    },
    update: { role: "OWNER" },
    create: {
      businessId: business.id,
      userId: ownerCandidate.id,
      role: "OWNER",
    },
  });

  console.log(`Demo agency + business seeded (business id: ${business.id})`);
  return business;
}

// ---------------------------------------------------------------------------
// Backfill businessId en datos del CRM existentes (Phase 1 -> Phase 4)
// ---------------------------------------------------------------------------

const TENANT_MODELS = [
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
] as const;

// Backfill ya no es necesario: tras Phase 4, `businessId` es NOT NULL,
// por lo que ninguna fila puede existir sin owner. Mantenemos la lista
// como referencia documental.
void TENANT_MODELS;

// ---------------------------------------------------------------------------
// Public entrypoint
// ---------------------------------------------------------------------------

export async function seedTenancy(prisma: PrismaClient) {
  await seedPlans(prisma);
  const business = await seedDemoTenant(prisma);
  return business;
}
