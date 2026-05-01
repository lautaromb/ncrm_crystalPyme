/**
 * lib/billing/revenue-share.ts
 *
 * Calcula el revenue share que la plataforma le cobra a una agency:
 *   18% (configurable) sobre la suma de priceUSD de los planes de sus businesses activos.
 *
 * "Activos" = status ACTIVE o TRIAL (los SUSPENDED/CANCELLED no generan revenue share).
 */

import { prismadb } from "@/lib/prisma";
import Decimal from "decimal.js";

/** Porcentaje de revenue share, configurable vía env. Por defecto 18%. */
export const REVENUE_SHARE_PERCENT = Number(
  process.env.PLATFORM_REVENUE_SHARE_PERCENT ?? "18"
);

export interface RevenueShareResult {
  /** Suma de priceUSD de los planes de businesses activos de la agency. */
  activeBusinessPlanRevenue: Decimal;
  /** Revenue share = activeBusinessPlanRevenue × REVENUE_SHARE_PERCENT / 100 */
  revenueShare: Decimal;
  /** Detalle por business (útil para los line items de la factura). */
  items: Array<{
    businessId: string;
    businessName: string;
    planName: string;
    planPriceUSD: Decimal;
    shareAmount: Decimal;
  }>;
}

/**
 * Calcula el revenue share para una agency.
 *
 * Se basa en los businesses ACTIVOS/TRIAL en el momento de la consulta
 * (no en el historial de cambios de plan durante el período).
 */
export async function calculateRevenueShare(
  agencyId: string
): Promise<RevenueShareResult> {
  const businesses = await prismadb.business.findMany({
    where: {
      agencyId,
      status: { in: ["ACTIVE", "TRIAL"] },
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      plan: {
        select: {
          name: true,
          priceUSD: true,
        },
      },
    },
  });

  const multiplier = new Decimal(REVENUE_SHARE_PERCENT).div(100);

  const items = businesses.map((b) => {
    const planPriceUSD = new Decimal(b.plan.priceUSD.toString());
    const shareAmount = planPriceUSD.mul(multiplier).toDecimalPlaces(2);
    return {
      businessId: b.id,
      businessName: b.name,
      planName: b.plan.name,
      planPriceUSD,
      shareAmount,
    };
  });

  const activeBusinessPlanRevenue = items.reduce(
    (sum, item) => sum.add(item.planPriceUSD),
    new Decimal(0)
  );

  const revenueShare = items.reduce(
    (sum, item) => sum.add(item.shareAmount),
    new Decimal(0)
  );

  return { activeBusinessPlanRevenue, revenueShare, items };
}
