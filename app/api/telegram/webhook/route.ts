/**
 * app/api/telegram/webhook/route.ts
 *
 * Endpoint que recibe actualizaciones de Telegram.
 * Ruta pública — no requiere sesión.
 *
 * Seguridad: Telegram envía el header X-Telegram-Bot-Api-Secret-Token
 * con el valor configurado en setWebhook (TELEGRAM_WEBHOOK_SECRET).
 */

import { NextRequest, NextResponse } from "next/server";
import type { TelegramUpdate } from "@/lib/telegram/types";
import { routeUpdate } from "@/lib/telegram/router";

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

  // 3. Procesar update — siempre devolvemos 200 rápido para que Telegram no reintente
  //    Los errores internos se loguean pero no se propagan.
  try {
    await routeUpdate(update);
  } catch (err) {
    console.error("[telegram/webhook] Error procesando update:", err);
  }

  return NextResponse.json({ ok: true });
}
