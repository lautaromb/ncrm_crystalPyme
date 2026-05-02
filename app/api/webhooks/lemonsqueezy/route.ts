/**
 * app/api/webhooks/lemonsqueezy/route.ts
 *
 * Webhook handler para eventos de LemonSqueezy.
 * Ruta pública — no requiere sesión (está en PUBLIC_PATHS del middleware).
 *
 * Eventos procesados:
 *   order_created  → pago exitoso → marcar factura PAID
 *
 * Verificación: HMAC-SHA256 via header X-Signature
 */

import { NextRequest, NextResponse } from "next/server";
import {
  verifyLemonSqueezySignature,
  type LsOrderCreatedEvent,
} from "@/lib/payments/lemonsqueezy";
import { markInvoicePaid } from "@/lib/payments/mark-paid";

export async function POST(req: NextRequest) {
  // 1. Leer body como texto (necesario para verificar la firma)
  const rawBody = await req.text();
  const signature = req.headers.get("X-Signature");

  // 2. Verificar firma
  if (!verifyLemonSqueezySignature(rawBody, signature)) {
    console.warn("[webhook/lemonsqueezy] Firma inválida");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: LsOrderCreatedEvent;
  try {
    event = JSON.parse(rawBody) as LsOrderCreatedEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // 3. Solo procesar order_created con status "paid"
  if (
    event.meta.event_name !== "order_created" ||
    event.data.attributes.status !== "paid"
  ) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  // 4. Extraer invoiceId de custom_data
  const invoiceId = event.meta.custom_data?.invoice_id;
  if (!invoiceId) {
    console.warn("[webhook/lemonsqueezy] order_created sin invoice_id en custom_data", {
      orderId: event.data.id,
    });
    return NextResponse.json({ ok: true, skipped: "no invoice_id" });
  }

  // 5. Marcar factura pagada
  const result = await markInvoicePaid({
    invoiceId,
    provider: "LEMONSQUEEZY",
    providerRef: event.data.id,
    providerPayload: event,
    paidAt: new Date(),
  });

  if (!result.ok) {
    console.error("[webhook/lemonsqueezy] markInvoicePaid falló:", result.error);

    if (result.transient) {
      // Error de infraestructura (DB caída, timeout) → LemonSqueezy debe reintentar
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Error de negocio (factura no encontrada, estado inválido) → no reintentar
    return NextResponse.json({ ok: false, error: result.error });
  }

  if (result.alreadyPaid) {
    return NextResponse.json({ ok: true, alreadyPaid: true });
  }

  return NextResponse.json({ ok: true });
}
