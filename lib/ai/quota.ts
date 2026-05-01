/**
 * lib/ai/quota.ts
 *
 * Gestión de cuotas de AI por business.
 * Las cuotas se definen en Plan.maxAIImagesMonthly / maxAITokensMonthly.
 * El uso se trackea en Business.aiImagesUsedThisMonth / aiTokensUsedThisMonth.
 * El reset mensual lo hace el cron inngest/functions/billing/quota-reset.ts.
 */

import { prismadb } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type QuotaType = "image" | "token";

export interface QuotaStatus {
  /** Cuota total del plan (null = ilimitada) */
  limit: number | null;
  /** Uso actual del mes */
  used: number;
  /** Cuota restante (null = ilimitada) */
  remaining: number | null;
  /** Si está dentro del límite */
  allowed: boolean;
}

export interface BusinessQuotaStatus {
  images: QuotaStatus;
  tokens: QuotaStatus;
}

// ---------------------------------------------------------------------------
// getQuotaStatus — estado actual de cuotas del business
// ---------------------------------------------------------------------------

export async function getQuotaStatus(businessId: string): Promise<BusinessQuotaStatus> {
  const business = await prismadb.business.findUnique({
    where: { id: businessId },
    select: {
      aiImagesUsedThisMonth: true,
      aiTokensUsedThisMonth: true,
      plan: {
        select: {
          maxAIImagesMonthly: true,
          maxAITokensMonthly: true,
        },
      },
    },
  });

  if (!business) throw new Error("Business no encontrado");

  const imageLimit = business.plan.maxAIImagesMonthly ?? null;
  const tokenLimit = business.plan.maxAITokensMonthly ?? null;
  const imageUsed = business.aiImagesUsedThisMonth;
  const tokenUsed = business.aiTokensUsedThisMonth;

  return {
    images: {
      limit: imageLimit,
      used: imageUsed,
      remaining: imageLimit === null ? null : Math.max(0, imageLimit - imageUsed),
      allowed: imageLimit === null || imageUsed < imageLimit,
    },
    tokens: {
      limit: tokenLimit,
      used: tokenUsed,
      remaining: tokenLimit === null ? null : Math.max(0, tokenLimit - tokenUsed),
      allowed: tokenLimit === null || tokenUsed < tokenLimit,
    },
  };
}

// ---------------------------------------------------------------------------
// checkImageQuota — lanza error si se superó la cuota de imágenes
// ---------------------------------------------------------------------------

export async function checkImageQuota(businessId: string, count = 1): Promise<void> {
  const status = await getQuotaStatus(businessId);
  if (!status.images.allowed) {
    throw new Error(
      `Cuota de imágenes AI agotada para este mes. Límite: ${status.images.limit}.`
    );
  }
  if (
    status.images.limit !== null &&
    status.images.used + count > status.images.limit
  ) {
    throw new Error(
      `No hay suficiente cuota de imágenes. Restante: ${status.images.remaining}, solicitado: ${count}.`
    );
  }
}

// ---------------------------------------------------------------------------
// consumeImageQuota — incrementa el contador de imágenes usadas
// ---------------------------------------------------------------------------

export async function consumeImageQuota(
  businessId: string,
  count = 1
): Promise<void> {
  await prismadb.business.update({
    where: { id: businessId },
    data: { aiImagesUsedThisMonth: { increment: count } },
  });
}

// ---------------------------------------------------------------------------
// consumeTokenQuota — incrementa el contador de tokens usados
// ---------------------------------------------------------------------------

export async function consumeTokenQuota(
  businessId: string,
  tokens: number
): Promise<void> {
  if (tokens <= 0) return;
  await prismadb.business.update({
    where: { id: businessId },
    data: { aiTokensUsedThisMonth: { increment: tokens } },
  });
}

// ---------------------------------------------------------------------------
// logAIUsage — registra un uso en AIUsageLog
// ---------------------------------------------------------------------------

export async function logAIUsage(params: {
  businessId: string;
  userId?: string | null;
  type: "IMAGE" | "CHAT" | "EMBEDDING" | "TRANSCRIPTION";
  provider?: string;
  model?: string;
  tokensInput?: number;
  tokensOutput?: number;
  imagesCount?: number;
  costUSD?: number;
  metadata?: Prisma.InputJsonValue;
}): Promise<void> {
  await prismadb.aIUsageLog.create({
    data: {
      businessId: params.businessId,
      userId: params.userId ?? null,
      type: params.type,
      provider: params.provider ?? null,
      model: params.model ?? null,
      tokensInput: params.tokensInput ?? null,
      tokensOutput: params.tokensOutput ?? null,
      imagesCount: params.imagesCount ?? null,
      costUSD: params.costUSD != null ? params.costUSD : null,
      metadata: params.metadata ?? undefined,
    },
  });
}
