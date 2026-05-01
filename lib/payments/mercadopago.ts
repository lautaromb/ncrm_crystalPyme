/**
 * lib/payments/mercadopago.ts
 *
 * Integración con Mercado Pago para pagos en ARS.
 * Usa la API REST v1 directamente (sin SDK).
 *
 * Docs: https://www.mercadopago.com.ar/developers/es/reference
 *
 * Variables de entorno requeridas:
 *   MERCADOPAGO_ACCESS_TOKEN   — token de acceso (producción o sandbox)
 *   MERCADOPAGO_WEBHOOK_SECRET — secret para verificar notificaciones (opcional pero recomendado)
 *
 * Notas:
 *   - MP acepta pagos en ARS solamente (cuenta AR).
 *   - Para cobros en USD se usa LemonSqueezy.
 *   - Las notificaciones IPN de MP traen un `payment.id` que hay que verificar
 *     consultando la API.
 */

import { createHmac, timingSafeEqual } from "crypto";

const MP_API = "https://api.mercadopago.com";

// ---------------------------------------------------------------------------
// Tipos mínimos
// ---------------------------------------------------------------------------

interface MpPreferenceResponse {
  id: string;
  init_point: string;      // URL de pago (producción)
  sandbox_init_point: string; // URL de pago (sandbox)
}

interface MpPaymentResponse {
  id: number;
  status: string;          // "approved" | "pending" | "rejected" | ...
  status_detail: string;
  currency_id: string;
  transaction_amount: number;
  external_reference: string; // nuestro invoiceId
  metadata?: {
    invoice_id?: string;
    invoice_number?: string;
  };
}

// ---------------------------------------------------------------------------
// Crear preferencia de pago
// ---------------------------------------------------------------------------

/**
 * Crea una preferencia de pago en Mercado Pago para cobrar una factura en ARS.
 * @returns URL de checkout (init_point en producción, sandbox_init_point en sandbox).
 */
export async function createMercadoPagoPreference(params: {
  invoiceId: string;
  invoiceNumber: string;
  agencyName: string;
  agencyEmail: string;
  totalAmountARS: string; // "45000.00"
  successUrl?: string;
  failureUrl?: string;
  pendingUrl?: string;
}): Promise<{ checkoutUrl: string; preferenceId: string }> {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("[MercadoPago] Variable de entorno MERCADOPAGO_ACCESS_TOKEN faltante");
  }

  const isSandbox = accessToken.startsWith("TEST-");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const body = {
    items: [
      {
        id: params.invoiceId,
        title: `Factura ${params.invoiceNumber} — CrystalPyme`,
        description: `Suscripción mensual CrystalPyme — ${params.agencyName}`,
        quantity: 1,
        currency_id: "ARS",
        unit_price: parseFloat(params.totalAmountARS),
      },
    ],
    payer: {
      name: params.agencyName,
      email: params.agencyEmail,
    },
    external_reference: params.invoiceId, // lo usamos para correlacionar en el webhook
    metadata: {
      invoice_id: params.invoiceId,
      invoice_number: params.invoiceNumber,
    },
    back_urls: {
      success: params.successUrl ?? `${appUrl}/admin/billing?payment=success`,
      failure: params.failureUrl ?? `${appUrl}/admin/billing?payment=failure`,
      pending: params.pendingUrl ?? `${appUrl}/admin/billing?payment=pending`,
    },
    auto_return: "approved",
    notification_url: `${appUrl}/api/webhooks/mercadopago`,
    statement_descriptor: "CrystalPyme",
  };

  const res = await fetch(`${MP_API}/checkout/preferences`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[MercadoPago] Error creando preferencia ${res.status}: ${text}`);
  }

  const json = (await res.json()) as MpPreferenceResponse;
  const checkoutUrl = isSandbox ? json.sandbox_init_point : json.init_point;

  return { checkoutUrl, preferenceId: json.id };
}

// ---------------------------------------------------------------------------
// Verificar pago (consultando la API de MP)
// ---------------------------------------------------------------------------

/**
 * Verifica un pago consultando la API de Mercado Pago.
 * Las notificaciones IPN solo traen el ID — hay que consultar el detalle.
 */
export async function getMercadoPagoPayment(paymentId: string): Promise<MpPaymentResponse> {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("[MercadoPago] Variable de entorno MERCADOPAGO_ACCESS_TOKEN faltante");
  }

  const res = await fetch(`${MP_API}/v1/payments/${paymentId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    // No cachear: necesitamos el estado más reciente
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[MercadoPago] Error obteniendo pago ${paymentId}: ${res.status} ${text}`);
  }

  return res.json() as Promise<MpPaymentResponse>;
}

// ---------------------------------------------------------------------------
// Verificar firma de webhook (x-signature header)
// ---------------------------------------------------------------------------

/**
 * Verifica la firma del webhook de Mercado Pago (v2).
 * MP envía: x-signature: ts=...,v1=<hmac>
 *
 * Docs: https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks
 */
export function verifyMercadoPagoSignature(
  rawBody: string,
  xSignature: string | null,
  xRequestId: string | null
): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) return true; // Si no hay secret configurado, no verificamos (modo debug)
  if (!xSignature) return false;

  // Extraer ts y v1 del header
  const parts = Object.fromEntries(
    xSignature.split(",").map((p) => p.split("=") as [string, string])
  );
  const ts = parts["ts"];
  const v1 = parts["v1"];
  if (!ts || !v1) return false;

  // Mensaje a firmar: id:<data.id>;request-id:<x-request-id>;ts:<ts>;
  // En notificaciones de tipo "payment", data.id es el paymentId.
  // Como aún no parseamos el body, usamos rawBody para extraer data.id.
  let dataId = "";
  try {
    const parsed = JSON.parse(rawBody) as { data?: { id?: string } };
    dataId = parsed.data?.id ?? "";
  } catch {
    return false;
  }

  const manifest = `id:${dataId};request-id:${xRequestId ?? ""};ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");

  try {
    return timingSafeEqual(Buffer.from(v1), Buffer.from(expected));
  } catch {
    return false;
  }
}
