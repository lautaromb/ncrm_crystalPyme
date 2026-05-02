/**
 * lib/minio.ts
 *
 * Cliente S3 para MinIO (o cualquier almacenamiento S3-compatible).
 *
 * IMPORTANTE: La inicialización es LAZY para evitar que la app crashee al
 * arrancar si las variables de entorno no están configuradas. El error se
 * lanza solo cuando se intenta usar el cliente por primera vez.
 *
 * Uso:
 *   import { getMinioClient, isMinioConfigured, MINIO_BUCKET, MINIO_PUBLIC_URL } from "@/lib/minio";
 *
 *   if (isMinioConfigured()) {
 *     const client = getMinioClient(); // lanza si no está configurado
 *     await client.send(new PutObjectCommand({ ... }));
 *   }
 */

import { S3Client } from "@aws-sdk/client-s3";

// ---------------------------------------------------------------------------
// Cliente lazy — se inicializa una sola vez en el primer uso
// ---------------------------------------------------------------------------

let _client: S3Client | null = null;

export function getMinioClient(): S3Client {
  if (_client) return _client;

  const endpoint = process.env.MINIO_ENDPOINT;
  const accessKeyId = process.env.MINIO_ACCESS_KEY;
  const secretAccessKey = process.env.MINIO_SECRET_KEY;
  const bucket = process.env.MINIO_BUCKET;

  if (!endpoint) throw new Error("MINIO_ENDPOINT is not defined");
  if (!accessKeyId) throw new Error("MINIO_ACCESS_KEY is not defined");
  if (!secretAccessKey) throw new Error("MINIO_SECRET_KEY is not defined");
  if (!bucket) throw new Error("MINIO_BUCKET is not defined");

  _client = new S3Client({
    endpoint,
    region: "us-east-1", // MinIO requires a region value; actual value doesn't matter
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true, // REQUIRED for MinIO — without this, SDK uses virtual-hosted-style which breaks
  });

  return _client;
}

/**
 * Verifica si MinIO está configurado SIN lanzar error.
 * Usar para feature flags: if (isMinioConfigured()) { ... }
 */
export function isMinioConfigured(): boolean {
  return !!(
    process.env.MINIO_ENDPOINT &&
    process.env.MINIO_ACCESS_KEY &&
    process.env.MINIO_SECRET_KEY &&
    process.env.MINIO_BUCKET
  );
}

// ---------------------------------------------------------------------------
// Backward compatibility: minioClient como proxy lazy
// Los archivos existentes que importan `minioClient` directamente siguen funcionando.
// El error se propaga solo cuando se usa, no al importar el módulo.
// ---------------------------------------------------------------------------

export const minioClient = new Proxy({} as S3Client, {
  get(_, prop) {
    const client = getMinioClient();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function"
      ? (value as Function).bind(client)
      : value;
  },
});

export const MINIO_BUCKET = process.env.MINIO_BUCKET ?? "";
export const MINIO_PUBLIC_URL = process.env.NEXT_PUBLIC_MINIO_ENDPOINT ?? "";
