/**
 * app/api/webhooks/mercadopago/route.ts
 *
 * Webhook handler para notificaciones IPN de Mercado Pago.
 * Ruta pública — no requiere sesión (está en PUBLIC_PATHS del middleware).
 *
 * Mercado Pago envía notificaciones con:
 *   { type: "payment", data: { id: "<paymentId>" } }
 *
 * El handler debe responder 200 rápido para que MP no marque la notificación
 * como fallida. Verificamos el pago consultando la API de MP.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  verifyMercadoPagoSignature,
  getMercadoPagoPayment,
} from "@/lib/payments/mercadopago";
import { markInvoicePaid } from "@/lib/payments/mark-paid";

interface MpNotification {
  type: string;          // "payment" | "merchant_order" | ...
  action?: string;       // "payment.created" | "payment.updated"
  data: {
    id: string;          // payment ID
  };
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id");

  // 1. Verificar firma (si MERCADOPAGO_WEBHOOK_SECRET está configurado)
  if (!verifyMercadoPagoSignature(rawBody, xSignature, xRequestId)) {
    console.warn("[webhook/mercadopago] Firma inválida");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let notification: MpNotification;
  try {
    notification = JSON.parse(rawBody) as MpNotification;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // 2. Solo procesamos notificaciones de tipo "payment"
  if (notification.type !== "payment") {
    return NextResponse.json({ ok: true, skipped: `type=${notification.type}` });
  }

  const paymentId = notification.data?.id;
  if (!paymentId) {
    return NextResponse.json({ ok: true, skipped: "no payment id" });
  }

  // 3. Consultar el detalle del pago a MP (las notificaciones IPN no traen el monto)
  let payment;
  try {
    payment = await getMercadoPagoPayment(paymentId);
  } catch (err) {
    console.error("[webhook/mercadopago] Error obteniendo pago:", err);
    // Retornar 500 para que MP reintente
    return NextResponse.json({ error: "Failed to fetch payment" }, { status: 500 });
  }

  // 4. Solo procesar pagos aprobados
  if (payment.status !== "approved") {
    return NextResponse.json({
      ok: true,
      skipped: `status=${payment.status}`,
    });
  }

  // 5. Extraer invoiceId de external_reference o metadata
  const invoiceId =
    payment.external_reference ?? payment.metadata?.invoice_id;

  if (!invoiceId) {
    console.warn("[webhook/mercadopago] Pago aprobado sin invoiceId", {
      paymentId,
    });
    return NextResponse.json({ ok: true, skipped: "no invoice_id" });
  }

  // 6. Marcar factura pagada
  const result = await markInvoicePaid({
    invoiceId,
    provider: "MERCADOPAGO",
    providerRef: String(payment.id),
    providerPayload: payment,
    paidAt: new Date(),
  });

  if (!result.ok) {
    console.error("[webhook/mercadopago] markInvoicePaid falló:", result.error);
    return NextResponse.json({ ok: false, error: result.error });
  }

  return NextResponse.json({ ok: true, alreadyPaid: result.alreadyPaid ?? false });
}
