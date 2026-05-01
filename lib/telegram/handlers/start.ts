/**
 * lib/telegram/handlers/start.ts
 *
 * Maneja el comando /start.
 *
 * Casos:
 *  1. /start biz_<slug>  → cliente llega desde deeplink del negocio
 *  2. /start             → sin parámetro → mensaje genérico
 *
 * Deep link generado por el negocio:
 *   t.me/<BOT_USERNAME>?start=biz_<businessSlug>
 */

import { prismadb } from "@/lib/prisma";
import {
  sendMessage,
  sendTyping,
  REQUEST_CONTACT_KEYBOARD,
} from "../api";
import type { TelegramMessage } from "../types";
import { normalizeTelegramPhone } from "../utils";

export async function handleStart(message: TelegramMessage): Promise<void> {
  const from = message.from;
  const chatId = message.chat.id;
  if (!from) return;

  const text = message.text ?? "";
  const param = text.replace("/start", "").trim(); // "biz_<slug>" o ""

  await sendTyping(chatId);

  // ── Sin parámetro ────────────────────────────────────────────
  if (!param) {
    await sendMessage({
      chat_id: chatId,
      text:
        "👋 Hola! Soy el asistente de CrystalPyme.\n\n" +
        "Para conectarme con tu cuenta, usá el link que te proporcionó tu proveedor " +
        "o escribile directamente a tu negocio para que te envíe el enlace de acceso.",
    });
    return;
  }

  // ── Con parámetro biz_<slug> ─────────────────────────────────
  if (!param.startsWith("biz_")) {
    await sendMessage({
      chat_id: chatId,
      text: "❌ Link inválido. Pedile al negocio que te envíe el link correcto.",
    });
    return;
  }

  const businessSlug = param.slice(4); // quitar "biz_"
  const business = await prismadb.business.findUnique({
    where: { slug: businessSlug },
    select: { id: true, name: true, telegramConfigured: true },
  });

  if (!business) {
    await sendMessage({
      chat_id: chatId,
      text: "❌ No encontramos ese negocio. El link puede haber expirado.",
    });
    return;
  }

  if (!business.telegramConfigured) {
    await sendMessage({
      chat_id: chatId,
      text: `⚠️ <b>${business.name}</b> todavía no tiene Telegram activado. Contactalos por otro medio.`,
      parse_mode: "HTML",
    });
    return;
  }

  const telegramUserId = String(from.id);

  // Verificar si este usuario ya está vinculado a este negocio
  const existing = await prismadb.telegramContact.findFirst({
    where: { telegramUserId, businessId: business.id },
  });

  if (existing?.isVerified) {
    const name = existing.displayName ?? from.first_name;
    await sendMessage({
      chat_id: chatId,
      text:
        `👋 ¡Hola de nuevo, <b>${name}</b>!\n\n` +
        `Estás conectado a <b>${business.name}</b>.\n` +
        `Escribime cualquier mensaje y se lo haré llegar al equipo.`,
      parse_mode: "HTML",
    });
    // Actualizar chatId por si cambió
    await prismadb.telegramContact.update({
      where: { id: existing.id },
      data: { telegramChatId: String(chatId) },
    });
    return;
  }

  // Usuario nuevo o pendiente de verificación → crear/actualizar registro pending
  const pendingPhone = `pending:${telegramUserId}`;
  await prismadb.telegramContact.upsert({
    where: {
      businessId_phoneNumber: { businessId: business.id, phoneNumber: pendingPhone },
    },
    create: {
      businessId: business.id,
      phoneNumber: pendingPhone,
      telegramUserId,
      telegramChatId: String(chatId),
      displayName: [from.first_name, from.last_name].filter(Boolean).join(" "),
      isVerified: false,
    },
    update: {
      telegramChatId: String(chatId),
      displayName: [from.first_name, from.last_name].filter(Boolean).join(" "),
    },
  });

  await sendMessage({
    chat_id: chatId,
    text:
      `👋 Hola, <b>${from.first_name}</b>!\n\n` +
      `Te conectaste con <b>${business.name}</b>.\n\n` +
      `Para verificar tu identidad, tocá el botón y compartí tu número de teléfono.`,
    parse_mode: "HTML",
    reply_markup: REQUEST_CONTACT_KEYBOARD,
  });
}
