"use server";
/**
 * actions/ai/generate-image.ts
 *
 * Server action para generar imágenes con DALL-E 3.
 * Flujo:
 *   1. Verifica contexto de business y sesión.
 *   2. Valida la cuota del plan antes de consumirla.
 *   3. Llama a DALL-E 3.
 *   4. Consume la cuota y registra el uso en AIUsageLog.
 *   5. Devuelve la URL de la imagen.
 */

import { requireBusinessContext } from "@/lib/tenant";
import { checkImageQuota, consumeImageQuota, logAIUsage } from "@/lib/ai/quota";
import { Prisma } from "@prisma/client";
import { generateImage } from "@/lib/ai/image-gen";
import type { ImageSize, ImageStyle, ImageQuality } from "@/lib/ai/image-gen";

// ---------------------------------------------------------------------------
// Tipos de entrada
// ---------------------------------------------------------------------------

export interface GenerateImageInput {
  prompt: string;
  size?: ImageSize;
  style?: ImageStyle;
  quality?: ImageQuality;
}

export interface GenerateImageResult {
  ok: boolean;
  url?: string;
  revisedPrompt?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Server action principal
// ---------------------------------------------------------------------------

export async function generateImageAction(
  input: GenerateImageInput
): Promise<GenerateImageResult> {
  try {
    const { businessId, ctx } = await requireBusinessContext();

    // 1. Validar cuota ANTES de llamar a OpenAI
    await checkImageQuota(businessId, 1);

    // 2. Generar imagen
    const result = await generateImage({
      prompt: input.prompt,
      size: input.size ?? "1024x1024",
      style: input.style ?? "vivid",
      quality: input.quality ?? "standard",
    });

    // 3. Consumir cuota y loggear uso (en paralelo, no bloquea respuesta)
    await Promise.all([
      consumeImageQuota(businessId, 1),
      logAIUsage({
        businessId,
        userId: ctx.userId,
        type: "IMAGE",
        provider: "openai",
        model: "dall-e-3",
        imagesCount: 1,
        costUSD: result.estimatedCostUSD,
        metadata: {
          prompt: input.prompt,
          revisedPrompt: result.revisedPrompt,
          size: input.size ?? "1024x1024",
          style: input.style ?? "vivid",
          quality: input.quality ?? "standard",
          url: result.url,
        } satisfies Prisma.InputJsonValue,
      }),
    ]);

    return { ok: true, url: result.url, revisedPrompt: result.revisedPrompt };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error inesperado",
    };
  }
}
