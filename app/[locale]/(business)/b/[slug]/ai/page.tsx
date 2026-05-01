/**
 * app/[locale]/(business)/b/[slug]/ai/page.tsx
 *
 * AI Studio — generación de imágenes con DALL·E 3.
 * Carga: quota actual + últimas 20 imágenes generadas (AIUsageLogs).
 */

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-server";
import { prismadb } from "@/lib/prisma";
import { getQuotaStatus } from "@/lib/ai/quota";
import { ImageGenerator } from "./_components/image-generator";
import type { BusinessQuotaStatus } from "@/lib/ai/quota";

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export const metadata = {
  title: "AI Studio",
};

export default async function AIStudioPage({ params }: PageProps) {
  const { slug } = await params;

  const session = await getSession();
  if (!session?.user) redirect("/sign-in");

  // Buscar business
  const business = await prismadb.business.findUnique({
    where: { slug },
    select: { id: true, name: true },
  });
  if (!business) redirect("/");

  // Cargar quota y últimas imágenes en paralelo
  const [quota, recentLogs] = await Promise.all([
    getQuotaStatus(business.id),
    prismadb.aIUsageLog.findMany({
      where: {
        businessId: business.id,
        type: "IMAGE",
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, metadata: true, createdAt: true },
    }),
  ]);

  // Mapear logs a imágenes
  const initialImages = recentLogs
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
    .filter(Boolean) as Array<{
    id: string;
    url: string;
    prompt: string;
    revisedPrompt: string;
    size: string;
    style: string;
    quality: string;
    createdAt: string;
  }>;

  return (
    <ImageGenerator
      quota={quota as BusinessQuotaStatus}
      initialImages={initialImages}
    />
  );
}
