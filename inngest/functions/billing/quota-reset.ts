/**
 * inngest/functions/billing/quota-reset.ts
 *
 * Job mensual: resetea los contadores de uso AI de todos los businesses activos.
 * Cron: 1° de cada mes a las 01:00 UTC (antes del monthly-billing a las 02:00).
 *
 * Resetea:
 *   - Business.aiImagesUsedThisMonth → 0
 *   - Business.aiTokensUsedThisMonth → 0
 *   - Business.quotaResetAt          → now
 */

import { inngest } from "@/inngest/client";
import { prismadb } from "@/lib/prisma";

export const quotaReset = inngest.createFunction(
  {
    id: "platform-quota-reset",
    name: "Platform — Monthly Quota Reset",
    triggers: [{ cron: "0 1 1 * *" }],
  },
  async ({ step }: { step: any }) => {
    const resetAt = new Date();

    const result: { count: number } = await step.run(
      "reset-ai-quotas",
      async () => {
        const updated = await prismadb.business.updateMany({
          where: {
            // Solo businesses con uso registrado (optimiza UPDATE en tabla grande)
            OR: [
              { aiImagesUsedThisMonth: { gt: 0 } },
              { aiTokensUsedThisMonth: { gt: 0 } },
            ],
            // No resetear businesses cancelados
            status: { notIn: ["CANCELLED"] },
          },
          data: {
            aiImagesUsedThisMonth: 0,
            aiTokensUsedThisMonth: 0,
            quotaResetAt: resetAt,
          },
        });

        return { count: updated.count };
      }
    );

    return {
      resetAt: resetAt.toISOString(),
      businessesReset: result.count,
    };
  }
);
