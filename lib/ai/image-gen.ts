/**
 * lib/ai/image-gen.ts
 *
 * Generación de imágenes con OpenAI DALL-E 3.
 * Usa OPENAI_API_KEY del env (clave de plataforma global, no por usuario).
 *
 * Flujo de persistencia:
 *   1. DALL-E genera la imagen y devuelve una URL efímera (~1h de vida).
 *   2. Si MinIO está configurado, descargamos el blob y lo subimos a almacenamiento propio.
 *   3. Devolvemos la URL permanente. Si MinIO falla, devolvemos la URL de OpenAI con un warning.
 *
 * Nota: si en el futuro se quiere soporte por-usuario (API key del business),
 * se puede extender para leer de `api_keys` table via getApiKey().
 */

import OpenAI from "openai";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getMinioClient, isMinioConfigured, MINIO_BUCKET, MINIO_PUBLIC_URL } from "@/lib/minio";

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
  /** true si la URL es permanente (MinIO), false si es efímera (OpenAI, ~1h) */
  isPermanent: boolean;
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
// persistImage — descarga y sube a MinIO
// ---------------------------------------------------------------------------

async function persistToMinio(openAiUrl: string): Promise<string> {
  // Descargar blob desde la URL efímera de OpenAI
  const response = await fetch(openAiUrl);
  if (!response.ok) {
    throw new Error(`No se pudo descargar imagen de OpenAI: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") ?? "image/png";
  const ext = contentType.includes("jpeg") ? "jpg" : "png";

  // Nombre único: ai-images/YYYY/MM/DD/<timestamp>-<random>.<ext>
  const now = new Date();
  const datePrefix = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${String(now.getUTCDate()).padStart(2, "0")}`;
  const key = `ai-images/${datePrefix}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  await getMinioClient().send(
    new PutObjectCommand({
      Bucket: MINIO_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  // URL pública: NEXT_PUBLIC_MINIO_ENDPOINT/<bucket>/<key>
  const publicBase = MINIO_PUBLIC_URL.replace(/\/$/, "");
  return `${publicBase}/${MINIO_BUCKET}/${key}`;
}

// ---------------------------------------------------------------------------
// generateImage — genera una imagen con DALL-E 3 y la persiste
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

  const revisedPrompt = image.revised_prompt ?? prompt;
  const estimatedCostUSD = estimateCost(size, quality);

  // Intentar persistir en MinIO para tener una URL permanente
  if (isMinioConfigured()) {
    try {
      const permanentUrl = await persistToMinio(image.url);
      return { url: permanentUrl, revisedPrompt, estimatedCostUSD, isPermanent: true };
    } catch (storageErr) {
      // MinIO falló: devolver URL efímera de OpenAI con warning
      // La imagen seguirá funcionando ~1h pero no quedará en la galería después
      console.warn(
        "[image-gen] No se pudo persistir en MinIO, usando URL efímera de OpenAI (~1h):",
        storageErr instanceof Error ? storageErr.message : storageErr
      );
    }
  }

  // Fallback: URL efímera de OpenAI
  return { url: image.url, revisedPrompt, estimatedCostUSD, isPermanent: false };
}
