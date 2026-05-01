"use server";
/**
 * actions/telegram/configure.ts
 *
 * Server actions para que un business configure su integración de Telegram.
 *
 * enableTelegram  → activa Telegram para el business
 * disableTelegram → desactiva y desvincula
 * linkGroupChat   → vincula el chat ID de un grupo para notificaciones
 * getTelegramStatus → estado actual de la integración
 * getDeepLink     → genera el link para compartir con clientes
 */

import { prismadb } from "@/lib/prisma";
import { requireBusinessContext } from "@/lib/tenant";
import { getMe } from "@/lib/telegram/api";

// ---------------------------------------------------------------------------
// enableTelegram
// ---------------------------------------------------------------------------

export async function enableTelegram(): Promise<{ ok: boolean; deepLink?: string; error?: string }> {
  try {
    const { businessId } = await requireBusinessContext();

    await prismadb.business.update({
      where: { id: businessId },
      data: { telegramConfigured: true },
    });

    const deepLink = await buildDeepLink(businessId);
    return { ok: true, deepLink };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error inesperado" };
  }
}

// ---------------------------------------------------------------------------
// disableTelegram
// ---------------------------------------------------------------------------

export async function disableTelegram(): Promise<{ ok: boolean; error?: string }> {
  try {
    const { businessId } = await requireBusinessContext();

    await prismadb.business.update({
      where: { id: businessId },
      data: { telegramConfigured: false, telegramChatId: null },
    });

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error inesperado" };
  }
}

// ---------------------------------------------------------------------------
// linkGroupChat — vincula el chat ID para notificaciones al negocio
// ---------------------------------------------------------------------------

export async function linkGroupChat(chatId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const { businessId } = await requireBusinessContext();

    if (!chatId.trim()) {
      return { ok: false, error: "Chat ID requerido" };
    }

    // Verificar que no esté usado por otro business
    const conflict = await prismadb.business.findFirst({
      where: { telegramChatId: chatId, id: { not: businessId } },
    });
    if (conflict) {
      return { ok: false, error: "Ese chat ya está vinculado a otro negocio" };
    }

    await prismadb.business.update({
      where: { id: businessId },
      data: { telegramChatId: chatId },
    });

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error inesperado" };
  }
}

// ---------------------------------------------------------------------------
// getTelegramStatus
// ---------------------------------------------------------------------------

export async function getTelegramStatus(): Promise<{
  ok: boolean;
  configured: boolean;
  chatLinked: boolean;
  deepLink: string | null;
  contactCount: number;
  error?: string;
}> {
  try {
    const { businessId } = await requireBusinessContext();

    const [business, contactCount] = await Promise.all([
      prismadb.business.findUnique({
        where: { id: businessId },
        select: { slug: true, telegramConfigured: true, telegramChatId: true },
      }),
      prismadb.telegramContact.count({
        where: { businessId, isVerified: true },
      }),
    ]);

    if (!business) return { ok: false, configured: false, chatLinked: false, deepLink: null, contactCount: 0 };

    const deepLink = business.telegramConfigured
      ? await buildDeepLink(businessId, business.slug)
      : null;

    return {
      ok: true,
      configured: business.telegramConfigured,
      chatLinked: !!business.telegramChatId,
      deepLink,
      contactCount,
    };
  } catch (err) {
    return {
      ok: false, configured: false, chatLinked: false, deepLink: null, contactCount: 0,
      error: err instanceof Error ? err.message : "Error inesperado",
    };
  }
}

// ---------------------------------------------------------------------------
// Helper: construir deep link
// ---------------------------------------------------------------------------

async function buildDeepLink(businessId: string, slug?: string): Promise<string> {
  let businessSlug = slug;
  if (!businessSlug) {
    const b = await prismadb.business.findUnique({ where: { id: businessId }, select: { slug: true } });
    businessSlug = b?.slug ?? businessId;
  }

  try {
    const bot = await getMe();
    return `https://t.me/${bot.username}?start=biz_${businessSlug}`;
  } catch {
    // Si no hay token configurado, devolver un placeholder
    return `https://t.me/CrystalPymeBot?start=biz_${businessSlug}`;
  }
}
