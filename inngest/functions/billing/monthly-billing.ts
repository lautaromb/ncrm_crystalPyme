/**
 * inngest/functions/billing/monthly-billing.ts
 *
 * Job mensual: genera PlatformInvoices para todas las agencies activas.
 * Cron: 1° de cada mes a las 02:00 UTC.
 *
 * Por cada agency ACTIVE / TRIAL / PAST_DUE:
 *  - Verifica que no exista ya una factura para este período (idempotente).
 *  - Genera la estructura con generatePlatformInvoice().
 *  - Persiste Invoice + LineItems en $transaction.
 *  - Actualiza agency.lastInvoiceAt y agency.nextInvoiceAt.
 */

import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";
import { generatePlatformInvoice } from "@/lib/billing/invoice-generator";

export const monthlyBilling = inngest.createFunction(
  {
    id: "platform-monthly-billing",
    name: "Platform — Monthly Billing",
    triggers: [{ cron: "0 2 1 * *" }],
  },
  async ({ step }: { step: any }) => {
    const now = new Date();

    // -----------------------------------------------------------------------
    // 1. Calcular período del mes anterior
    // -----------------------------------------------------------------------
    const periodStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)
    );
    const periodEnd = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59, 999)
    );

    // -----------------------------------------------------------------------
    // 2. Cargar agencies elegibles
    // -----------------------------------------------------------------------
    const agencies: Array<{ id: string; name: string; slug: string }> =
      await step.run("load-eligible-agencies", async () => {
        return prismadb.agency.findMany({
          where: {
            status: { in: ["ACTIVE", "TRIAL", "PAST_DUE"] },
          },
          select: { id: true, name: true, slug: true },
          orderBy: { createdAt: "asc" },
        });
      });

    // -----------------------------------------------------------------------
    // 3. Procesar cada agency en steps separados (retryable individualmente)
    // -----------------------------------------------------------------------
    const results: Array<{
      agencyId: string;
      status: "created" | "skipped" | "error";
      number?: string;
      error?: string;
    }> = [];

    for (const agency of agencies) {
      const result: { agencyId: string; status: "created" | "skipped" | "error"; number?: string; error?: string } =
        await step.run(`invoice-agency-${agency.id}`, async () => {
          // Idempotencia: ¿ya existe factura para este período?
          const existing = await prismadb.platformInvoice.findFirst({
            where: {
              agencyId: agency.id,
              periodStart: { gte: periodStart },
              periodEnd: { lte: periodEnd },
            },
            select: { id: true, number: true },
          });

          if (existing) {
            return { agencyId: agency.id, status: "skipped" as const, number: existing.number };
          }

          try {
            const invoice = await generatePlatformInvoice(
              agency.id,
              periodStart,
              periodEnd
            );

            const created = await prismadb.$transaction(async (tx: any) => {
              const inv = await tx.platformInvoice.create({
                data: {
                  number: invoice.number,
                  agencyId: agency.id,
                  periodStart: invoice.periodStart,
                  periodEnd: invoice.periodEnd,
                  agencyPlanFee: invoice.agencyPlanFee.toString(),
                  revenueShare: invoice.revenueShare.toString(),
                  subtotal: invoice.subtotal.toString(),
                  taxAmount: invoice.taxAmount.toString(),
                  totalAmount: invoice.totalAmount.toString(),
                  currency: invoice.currency,
                  dueDate: invoice.dueDate,
                  status: "PENDING",
                  lineItems: {
                    create: invoice.lineItems.map((li) => ({
                      description: li.description,
                      businessId: li.businessId ?? null,
                      quantity: li.quantity,
                      unitPrice: li.unitPrice.toString(),
                      amount: li.amount.toString(),
                    })),
                  },
                },
              });

              await tx.agency.update({
                where: { id: agency.id },
                data: {
                  lastInvoiceAt: now,
                  nextInvoiceAt: new Date(
                    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)
                  ),
                },
              });

              return inv;
            });

            return { agencyId: agency.id, status: "created" as const, number: created.number };
          } catch (err) {
            const error = err instanceof Error ? err.message : String(err);
            return { agencyId: agency.id, status: "error" as const, error };
          }
        });

      results.push(result);
    }

    // -----------------------------------------------------------------------
    // 4. Resumen
    // -----------------------------------------------------------------------
    return {
      period: `${periodStart.toISOString().slice(0, 10)} → ${periodEnd.toISOString().slice(0, 10)}`,
      total: results.length,
      created: results.filter((r) => r.status === "created").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      errors: results.filter((r) => r.status === "error").length,
    };
  }
);
