/**
 * lib/telegram/handlers/contact.ts
 *
 * El usuario compartió su número de teléfono.
 * 1. Busca el registro pending de este telegramUserId
 * 2. Intenta matchear con un TelegramContact real (registrado por el negocio)
 * 3. Si no existe → crea uno nuevo (potencial nuevo lead)
 * 4. Notifica al negocio
 */

import { prismadb } from "@/lib/prisma";
import { sendMessage, REMOVE_KEYBOARD } from "../api";
import { normalizeTelegramPhone } from "../utils";
import type { TelegramMessage } from "../types";

export async function handleContact(message: TelegramMessage): Promise<void> {
  const from = message.from;
  const chatId = message.chat.id;
  const contact = message.contact;

  if (!from || !contact) return;

  const telegramUserId = String(from.id);
  const phone = normalizeTelegramPhone(contact.phone_number);
  const displayName = [contact.first_name, contact.last_name].filter(Boolean).join(" ")
    || from.first_name;

  // Buscar registro pending para este telegramUserId
  const pending = await prismadb.telegramContact.findFirst({
    where: {
      telegramUserId,
      isVerified: false,
    },
    select: { id: true, businessId: true, business: { select: { name: true } } },
  });

  if (!pending) {
    await sendMessage({
      chat_id: chatId,
      text: "⚠️ No encontré una sesión activa. Usá el link de tu negocio para empezar.",
      reply_markup: REMOVE_KEYBOARD,
    });
    return;
  }

  const { businessId } = pending;
  const businessName = pending.business.name;

  // Verificar si ya existe un TelegramContact con este teléfono para este negocio
  const existingReal = await prismadb.telegramContact.findFirst({
    where: { businessId, phoneNumber: phone },
    select: { id: true },
  });

  if (existingReal) {
    // Fusionar: actualizar el registro real con los datos de Telegram
    await prismadb.$transaction([
      prismadb.telegramContact.update({
        where: { id: existingReal.id },
        data: {
          telegramUserId,
          telegramChatId: String(chatId),
          displayName,
          isVerified: true,
          lastMessageAt: new Date(),
        },
      }),
      // Eliminar el registro pending (ya no lo necesitamos)
      prismadb.telegramContact.delete({ where: { id: pending.id } }),
    ]);
  } else {
    // Actualizar el registro pending convirtiéndolo en real
    await prismadb.telegramContact.update({
      where: { id: pending.id },
      data: {
        phoneNumber: phone,
        telegramChatId: String(chatId),
        displayName,
        isVerified: true,
        lastMessageAt: new Date(),
      },
    });

    // Auto-crear un crm_Lead para que el negocio lo vea
    try {
      await prismadb.crm_Leads.create({
        data: {
          businessId,
          v: 1,
          firstName: contact.first_name,
          lastName: contact.last_name ?? "",
          description: `Lead generado automáticamente vía Telegram. Teléfono: ${phone}`,
          createdBy: null,
          updatedBy: null,
        },
      });
    } catch {
      // No bloquear si el lead falla
    }
  }

  // Notificar al negocio si tiene chat configurado
  await notifyBusiness(businessId, `📲 <b>Nuevo contacto Telegram</b>\n👤 ${displayName}\n📞 ${phone}`);

  await sendMessage({
    chat_id: chatId,
    text:
      `✅ ¡Listo, <b>${displayName}</b>! Quedaste conectado a <b>${businessName}</b>.\n\n` +
      `Ahora podés escribirme cualquier consulta y se la haré llegar al equipo.`,
    parse_mode: "HTML",
    reply_markup: REMOVE_KEYBOARD,
  });
}

// ---------------------------------------------------------------------------
// Helper: notificar al negocio
// ---------------------------------------------------------------------------

export async function notifyBusiness(businessId: string, html: string): Promise<void> {
  try {
    const business = await prismadb.business.findUnique({
      where: { id: businessId },
      select: { telegramChatId: true },
    });
    if (!business?.telegramChatId) return;

    const { sendMessage } = await import("../api");
    await sendMessage({ chat_id: business.telegramChatId, text: html, parse_mode: "HTML" });
  } catch {
    // Notificación al negocio no debe romper el flujo del cliente
  }
}
