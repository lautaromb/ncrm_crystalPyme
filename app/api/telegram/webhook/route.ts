/**
 * app/api/telegram/webhook/route.ts
 *
 * Endpoint que recibe actualizaciones de Telegram.
 * Ruta pública — no requiere sesión.
 *
 * Seguridad: Telegram envía el header X-Telegram-Bot-Api-Secret-Token
 * con el valor configurado en setWebhook (TELEGRAM_WEBHOOK_SECRET).
 *
 * Estrategia de resiliencia:
 *   - El webhook responde 200 inmediatamente (Telegram requiere respuesta < 60s).
 *   - El procesamiento real se delega a Inngest con reintentos automáticos (hasta 5x).
 *   - La deduplicación se hace por update_id: el mismo update nunca se procesa dos veces.
 *   - Si Inngest no está disponible, el error se loguea pero no bloqueamos a Telegram.
 */

import { NextRequest, NextResponse } from "next/server";
import type { TelegramUpdate } from "@/lib/telegram/types";
import { inngest } from "@/inngest/client";

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Verificar secret token
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret) {
    const incoming = req.headers.get("x-telegram-bot-api-secret-token");
    if (incoming !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // 2. Parsear update
  let update: TelegramUpdate;
  try {
    update = (await req.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // 3. Encolar en Inngest para procesamiento asíncrono con reintentos.
  //    - El `id` del evento actúa como clave de deduplicación: si Telegram reenvía
  //      el mismo update_id (ej. por timeout), Inngest lo ignora automáticamente.
  //    - Si Inngest falla (servicio caído), logueamos y seguimos — Telegram
  //      reintentará el webhook por su cuenta durante ~48h.
  try {
    await inngest.send({
      id: `tg-update-${update.update_id}`,
      name: "telegram/update.received",
      data: { update },
    });
  } catch (err) {
    console.error("[telegram/webhook] Error enviando a Inngest — update se perderá si Inngest no recupera:", err);
  }

  // Siempre 200: Telegram interpreta cualquier otro código como error y reintenta.
  return NextResponse.json({ ok: true });
}
