/**
 * lib/telegram/router.ts
 *
 * Recibe un TelegramUpdate y lo despacha al handler correcto.
 *
 * Árbol de decisiones:
 *   message.text starts with "/start"  → handleStart
 *   message.contact present            → handleContact (usuario compartió teléfono)
 *   message.text present + chat private → handleMessage
 *   todo lo demás                      → ignorar silenciosamente
 */

import type { TelegramUpdate } from "./types";
import { handleStart } from "./handlers/start";
import { handleContact } from "./handlers/contact";
import { handleMessage } from "./handlers/message";

export async function routeUpdate(update: TelegramUpdate): Promise<void> {
  const msg = update.message;
  if (!msg) return; // callback_query y otros → ignorar por ahora

  // /start [param]
  if (msg.text?.startsWith("/start")) {
    await handleStart(msg);
    return;
  }

  // Usuario compartió su teléfono
  if (msg.contact) {
    await handleContact(msg);
    return;
  }

  // Mensaje de texto en chat privado
  if (msg.text && msg.chat.type === "private") {
    await handleMessage(msg);
    return;
  }

  // Grupos: ignorar mensajes que no sean comandos
}
