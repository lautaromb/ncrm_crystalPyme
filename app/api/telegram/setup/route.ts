/**
 * app/api/telegram/setup/route.ts
 *
 * Endpoint de administración para registrar/eliminar el webhook del bot.
 * Solo accesible con ADMIN_API_KEY en el header.
 *
 * POST /api/telegram/setup         → registra webhook
 * DELETE /api/telegram/setup       → elimina webhook
 * GET /api/telegram/setup          → estado del webhook
 */

import { NextRequest, NextResponse } from "next/server";
import { setWebhook, deleteWebhook, getWebhookInfo, getMe } from "@/lib/telegram/api";

function isAuthorized(req: NextRequest): boolean {
  const key = req.headers.get("x-admin-key");
  return key === process.env.ADMIN_API_KEY;
}

/** Registra el webhook */
export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    return NextResponse.json({ error: "NEXT_PUBLIC_APP_URL no configurado" }, { status: 500 });
  }

  const webhookUrl = `${appUrl}/api/telegram/webhook`;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

  try {
    const bot = await getMe();
    await setWebhook(webhookUrl, secret);

    return NextResponse.json({
      ok: true,
      bot: `@${bot.username}`,
      webhookUrl,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/** Obtiene el estado del webhook */
export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [info, bot] = await Promise.all([getWebhookInfo(), getMe()]);
    return NextResponse.json({ ok: true, bot: `@${bot.username}`, webhook: info });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

/** Elimina el webhook */
export async function DELETE(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await deleteWebhook();
    return NextResponse.json({ ok: true, message: "Webhook eliminado" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
