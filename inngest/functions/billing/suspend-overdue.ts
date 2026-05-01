/**
 * inngest/functions/billing/suspend-overdue.ts
 *
 * Job diario: detecta facturas vencidas y aplica el flujo de suspensión.
 * Cron: todos los días a las 09:00 UTC.
 *
 * Flujo de gracia:
 *   dueDate + PAST_DUE_GRACE_DAYS  → agency PAST_DUE,  invoice OVERDUE
 *   dueDate + SUSPEND_GRACE_DAYS   → agency SUSPENDED, businesses ORPHANED
 *
 * Variables de entorno:
 *   PLATFORM_PAST_DUE_GRACE_DAYS   (default 3)
 *   PLATFORM_SUSPEND_GRACE_DAYS    (default 10)
 */

import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";

const PAST_DUE_GRACE = Number(process.env.PLATFORM_PAST_DUE_GRACE_DAYS ?? "3");
const SUSPEND_GRACE = Number(process.env.PLATFORM_SUSPEND_GRACE_DAYS ?? "10");

export const suspendOverdue = inngest.createFunction(
  {
    id: "platform-suspend-overdue",
    name: "Platform — Suspend Overdue Agencies",
    triggers: [{ cron: "0 9 * * *" }],
  },
  async ({ step }: { step: any }) => {
    const now = new Date();

    const pastDueCutoff = daysAgo(now, PAST_DUE_GRACE);
    const suspendCutoff = daysAgo(now, SUSPEND_GRACE);

    // -----------------------------------------------------------------------
    // 1. PENDING → OVERDUE + agency → PAST_DUE (pasaron >= PAST_DUE_GRACE días)
    // -----------------------------------------------------------------------
    const pastDueResult: { updated: number } = await step.run(
      "mark-past-due",
      async () => {
        const overdueInvoices: Array<{ id: string; agencyId: string; number: string }> =
          await prismadb.platformInvoice.findMany({
            where: {
              status: "PENDING",
              dueDate: { lte: pastDueCutoff },
            },
            select: { id: true, agencyId: true, number: true },
          });

        if (overdueInvoices.length === 0) return { updated: 0 };

        // Deduplicar agencyIds sin Set spread (evita error de target TS)
        const agencyIdMap: Record<string, true> = {};
        for (const inv of overdueInvoices) {
          agencyIdMap[inv.agencyId] = true;
        }
        const agencyIds = Object.keys(agencyIdMap);
        const invoiceIds = overdueInvoices.map((i) => i.id);

        await prismadb.$transaction([
          prismadb.platformInvoice.updateMany({
            where: { id: { in: invoiceIds } },
            data: { status: "OVERDUE" },
          }),
          prismadb.agency.updateMany({
            where: {
              id: { in: agencyIds },
              status: { notIn: ["SUSPENDED", "CANCELLED"] },
            },
            data: { status: "PAST_DUE" },
          }),
        ]);

        return { updated: overdueInvoices.length };
      }
    );

    // -----------------------------------------------------------------------
    // 2. OVERDUE → agency SUSPENDED + businesses ORPHANED (>= SUSPEND_GRACE)
    // -----------------------------------------------------------------------
    const suspendResult: { suspended: number; orphaned: number } = await step.run(
      "suspend-agencies",
      async () => {
        const suspendableInvoices: Array<{ agencyId: string }> =
          await prismadb.platformInvoice.findMany({
            where: {
              status: "OVERDUE",
              dueDate: { lte: suspendCutoff },
            },
            select: { agencyId: true },
            distinct: ["agencyId"],
          });

        if (suspendableInvoices.length === 0) {
          return { suspended: 0, orphaned: 0 };
        }

        const agencyIds = suspendableInvoices.map((i) => i.agencyId);

        await prismadb.agency.updateMany({
          where: {
            id: { in: agencyIds },
            status: { notIn: ["CANCELLED"] },
          },
          data: {
            status: "SUSPENDED",
            suspendedAt: now,
          },
        });

        const orphanResult = await prismadb.business.updateMany({
          where: {
            agencyId: { in: agencyIds },
            status: { notIn: ["CANCELLED", "ORPHANED"] },
          },
          data: {
            status: "ORPHANED",
            orphanedAt: now,
          },
        });

        return { suspended: agencyIds.length, orphaned: orphanResult.count };
      }
    );

    return {
      pastDueCutoff: pastDueCutoff.toISOString(),
      suspendCutoff: suspendCutoff.toISOString(),
      pastDueUpdated: pastDueResult.updated,
      suspended: suspendResult.suspended,
      orphaned: suspendResult.orphaned,
    };
  }
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysAgo(from: Date, days: number): Date {
  const d = new Date(from);
  d.setDate(d.getDate() - days);
  return d;
}
