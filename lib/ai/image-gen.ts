/**
 * lib/ai/image-gen.ts
 *
 * Generación de imágenes con OpenAI DALL-E 3.
 * Usa OPENAI_API_KEY del env (clave de plataforma global, no por usuario).
 *
 * Nota: si en el futuro se quiere soporte por-usuario (API key del business),
 * se puede extender para leer de `api_keys` table via getApiKey().
 */

import OpenAI from "openai";

// ---------------------------------------------------------------------------
// Cliente OpenAI de plataforma
// ---------------------------------------------------------------------------

function getPlatformOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY no configurada en el servidor");
  return new OpenAI({ apiKey });
}

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type ImageSize = "1024x1024" | "1792x1024" | "1024x1792";
export type ImageStyle = "vivid" | "natural";
export type ImageQuality = "standard" | "hd";

export interface GenerateImageParams {
  prompt: string;
  size?: ImageSize;
  style?: ImageStyle;
  quality?: ImageQuality;
  /** Número de imágenes (DALL-E 3 solo soporta n=1) */
  n?: 1;
}

export interface GeneratedImage {
  url: string;
  revisedPrompt: string;
  /** Costo estimado en USD */
  estimatedCostUSD: number;
}

// ---------------------------------------------------------------------------
// Tabla de costos DALL-E 3 (USD, por imagen, actualizados 2024)
// ---------------------------------------------------------------------------

const COST_TABLE: Record<ImageQuality, Record<ImageSize, number>> = {
  standard: {
    "1024x1024": 0.04,
    "1792x1024": 0.08,
    "1024x1792": 0.08,
  },
  hd: {
    "1024x1024": 0.08,
    "1792x1024": 0.12,
    "1024x1792": 0.12,
  },
};

function estimateCost(size: ImageSize, quality: ImageQuality): number {
  return COST_TABLE[quality]?.[size] ?? 0.04;
}

// ---------------------------------------------------------------------------
// generateImage — genera una imagen con DALL-E 3
// ---------------------------------------------------------------------------

export async function generateImage(
  params: GenerateImageParams
): Promise<GeneratedImage> {
  const {
    prompt,
    size = "1024x1024",
    style = "vivid",
    quality = "standard",
  } = params;

  const client = getPlatformOpenAI();

  const response = await client.images.generate({
    model: "dall-e-3",
    prompt,
    size,
    style,
    quality,
    n: 1,
    response_format: "url",
  });

  const data = response.data ?? [];
  const image = data[0];
  if (!image?.url) throw new Error("DALL-E no devolvió imagen");

  return {
    url: image.url,
    revisedPrompt: image.revised_prompt ?? prompt,
    estimatedCostUSD: estimateCost(size, quality),
  };
}
