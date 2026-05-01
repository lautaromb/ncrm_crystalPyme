"use server";
/**
 * actions/ai/get-quota.ts
 *
 * Devuelve el estado de cuotas AI del business actual.
 * Usado por el dashboard y la página de AI Studio.
 */

import { requireBusinessContext } from "@/lib/tenant";
import { getQuotaStatus } from "@/lib/ai/quota";
import type { BusinessQuotaStatus } from "@/lib/ai/quota";
import { prismadb } from "@/lib/prisma";

export interface QuotaStatusResult {
  ok: boolean;
  quota?: BusinessQuotaStatus;
  recentImages?: Array<{
    id: string;
    url: string;
    prompt: string;
    revisedPrompt: string;
    size: string;
    style: string;
    quality: string;
    createdAt: string;
  }>;
  error?: string;
}

export async function getAIQuotaStatus(): Promise<QuotaStatusResult> {
  try {
    const { businessId } = await requireBusinessContext();

    const [quota, recentLogs] = await Promise.all([
      getQuotaStatus(businessId),
      prismadb.aIUsageLog.findMany({
        where: {
          businessId,
          type: "IMAGE",
          // Solo registros con URL en metadata
          metadata: { path: ["url"], not: "" },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, metadata: true, createdAt: true },
      }),
    ]);

    const recentImages = recentLogs
      .map((log) => {
        const meta = log.metadata as Record<string, string> | null;
        if (!meta?.url) return null;
        return {
          id: log.id,
          url: meta.url ?? "",
          prompt: meta.prompt ?? "",
          revisedPrompt: meta.revisedPrompt ?? "",
          size: meta.size ?? "1024x1024",
          style: meta.style ?? "vivid",
          quality: meta.quality ?? "standard",
          createdAt: log.createdAt.toISOString(),
        };
      })
      .filter(Boolean) as QuotaStatusResult["recentImages"];

    return { ok: true, quota, recentImages };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error inesperado",
    };
  }
}
