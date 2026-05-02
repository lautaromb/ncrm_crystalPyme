/**
 * inngest/functions/telegram/process-update.ts
 *
 * Procesa un Telegram update con reintentos automáticos.
 *
 * Flujo:
 *   1. El webhook de Telegram llama a inngest.send() y responde 200 inmediatamente.
 *   2. Inngest ejecuta esta función de forma asíncrona con backoff automático.
 *   3. Si falla (DB caída, error transitorio), Inngest reintenta hasta 5 veces.
 *   4. Deduplicación via `id` del evento → el mismo update_id nunca se procesa dos veces.
 */

import { inngest } from "@/inngest/client";
import { routeUpdate } from "@/lib/telegram/router";
import type { TelegramUpdate } from "@/lib/telegram/types";

export const processTelegramUpdate = inngest.createFunction(
  {
    id: "telegram/process-update",
    name: "Telegram — Procesar update",
    retries: 5,
    triggers: [{ event: "telegram/update.received" }],
  },
  async ({ event }: { event: { data: { update: TelegramUpdate } } }) => {
    const update = event.data.update;
    await routeUpdate(update);
    return { processed: update.update_id };
  }
);
