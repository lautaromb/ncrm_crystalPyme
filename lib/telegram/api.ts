/**
 * lib/telegram/api.ts
 * Wrapper de bajo nivel para la Telegram Bot API.
 * Usa fetch directamente — sin SDK.
 *
 * Env: TELEGRAM_BOT_TOKEN
 */

import type { ReplyMarkup } from "./types";

const BASE = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

// ---------------------------------------------------------------------------
// Helper genérico
// ---------------------------------------------------------------------------

async function call<T = unknown>(method: string, body?: object): Promise<T> {
  const res = await fetch(`${BASE}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = (await res.json()) as { ok: boolean; result: T; description?: string };
  if (!json.ok) {
    throw new Error(`[Telegram API] ${method} falló: ${json.description ?? "Unknown error"}`);
  }
  return json.result;
}

// ---------------------------------------------------------------------------
// Métodos
// ---------------------------------------------------------------------------

/** Envía un mensaje de texto. Soporta HTML y Markdown. */
export async function sendMessage(params: {
  chat_id: number | string;
  text: string;
  parse_mode?: "HTML" | "Markdown" | "MarkdownV2";
  reply_markup?: ReplyMarkup;
  disable_notification?: boolean;
}): Promise<void> {
  await call("sendMessage", params);
}

/** Muestra "escribiendo…" en el chat */
export async function sendTyping(chatId: number | string): Promise<void> {
  await call("sendChatAction", { chat_id: chatId, action: "typing" });
}

/** Registra el webhook del bot */
export async function setWebhook(url: string, secretToken?: string): Promise<void> {
  await call("setWebhook", {
    url,
    secret_token: secretToken,
    allowed_updates: ["message", "callback_query"],
  });
}

/** Elimina el webhook */
export async function deleteWebhook(): Promise<void> {
  await call("deleteWebhook", { drop_pending_updates: true });
}

/** Obtiene info del bot */
export async function getMe(): Promise<{ id: number; username: string; first_name: string }> {
  return call("getMe");
}

/** Obtiene info del webhook actual */
export async function getWebhookInfo(): Promise<{
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  last_error_message?: string;
}> {
  return call("getWebhookInfo");
}

// ---------------------------------------------------------------------------
// Helpers de UI
// ---------------------------------------------------------------------------

/** Keyboard que pide al usuario compartir su número de teléfono */
export const REQUEST_CONTACT_KEYBOARD: ReplyMarkup = {
  keyboard: [[{ text: "📱 Compartir mi número", request_contact: true }]],
  resize_keyboard: true,
  one_time_keyboard: true,
  input_field_placeholder: "Tocá el botón para compartir tu número",
};

/** Elimina el keyboard personalizado */
export const REMOVE_KEYBOARD: ReplyMarkup = { remove_keyboard: true };
