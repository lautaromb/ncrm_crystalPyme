/**
 * lib/telegram/utils.ts
 * Utilidades compartidas del módulo Telegram.
 */

/**
 * Normaliza un número de teléfono de Telegram al formato E.164 con "+".
 * Telegram envía sin "+" en message.contact.phone_number.
 * Ej: "5491112345678" → "+5491112345678"
 */
export function normalizeTelegramPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.startsWith("+") ? raw : `+${digits}`;
}

/**
 * Escapa caracteres especiales para MarkdownV2 de Telegram.
 */
export function escapeMd(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, (c) => `\\${c}`);
}

/**
 * Trunca un mensaje largo para que entre en un mensaje de Telegram (4096 chars max).
 */
export function truncate(text: string, max = 3800): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + "…";
}
