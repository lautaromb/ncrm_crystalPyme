/**
 * lib/telegram/handlers/message.ts
 *
 * Maneja mensajes de texto regulares de usuarios ya verificados.
 * 1. Identifica al usuario por telegramUserId
 * 2. Registra un crm_Activity (note) con el mensaje
 * 3. Notifica al negocio
 * 4. Responde con confirmación
 */

import { prismadb } from "@/lib/prisma";
import { sendMessage, sendTyping } from "../api";
import { notifyBusiness } from "./contact";
import { truncate } from "../utils";
import type { TelegramMessage } from "../types";

export async function handleMessage(message: TelegramMessage): Promise<void> {
  const from = message.from;
  const chatId = message.chat.id;
  const text = message.text?.trim();

  if (!from || !text) return;

  await sendTyping(chatId);

  const telegramUserId = String(from.id);

  // Buscar el contacto verificado
  const telegramContact = await prismadb.telegramContact.findFirst({
    where: { telegramUserId, isVerified: true },
    select: {
      id: true,
      businessId: true,
      displayName: true,
      phoneNumber: true,
      contactId: true,
      business: { select: { name: true } },
    },
  });

  if (!telegramContact) {
    // Usuario no identificado
    await sendMessage({
      chat_id: chatId,
      text:
        "No pude identificarte. Usá el link de tu negocio para conectarte:\n" +
        "preguntale a tu proveedor por el enlace de Telegram.",
    });
    return;
  }

  // Actualizar última actividad
  await prismadb.telegramContact.update({
    where: { id: telegramContact.id },
    data: { lastMessageAt: new Date() },
  });

  // Registrar como crm_Activity (note)
  try {
    const activity = await prismadb.crm_Activities.create({
      data: {
        businessId: telegramContact.businessId,
        type: "note",
        title: `Telegram: ${telegramContact.displayName ?? from.first_name}`,
        description: truncate(text),
        date: new Date(),
        status: "completed",
        metadata: {
          source: "telegram",
          telegramUserId,
          telegramChatId: String(chatId),
          phone: telegramContact.phoneNumber,
        },
      },
    });

    // Vincular la actividad al contacto CRM si existe
    if (telegramContact.contactId) {
      await prismadb.crm_ActivityLinks.create({
        data: {
          activityId: activity.id,
          entityType: "contact",
          entityId: telegramContact.contactId,
        },
      });
    }
  } catch (err) {
    console.error("[telegram/message] Error creando activity:", err);
  }

  // Notificar al negocio
  const preview = text.length > 120 ? text.slice(0, 120) + "…" : text;
  await notifyBusiness(
    telegramContact.businessId,
    `💬 <b>Mensaje de ${telegramContact.displayName ?? from.first_name}</b>\n` +
    `📞 ${telegramContact.phoneNumber}\n\n` +
    `"${preview}"`
  );

  // Responder al usuario
  await sendMessage({
    chat_id: chatId,
    text: `✅ Tu mensaje fue enviado a <b>${telegramContact.business.name}</b>. Te responderán a la brevedad.`,
    parse_mode: "HTML",
  });
}
