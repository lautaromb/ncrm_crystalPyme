/**
 * lib/payments/lemonsqueezy.ts
 *
 * Integración con LemonSqueezy para pagos en USD.
 * Usa la API REST v1 directamente (sin SDK) para mantener las dependencias mínimas.
 *
 * Docs: https://docs.lemonsqueezy.com/api/checkouts
 *
 * Variables de entorno requeridas:
 *   LEMONSQUEEZY_API_KEY          — clave de API (Bearer token)
 *   LEMONSQUEEZY_STORE_ID         — ID numérico de la tienda
 *   LEMONSQUEEZY_VARIANT_ID       — ID numérico de la variante del producto "Platform Subscription"
 *   LEMONSQUEEZY_WEBHOOK_SECRET   — secret para verificar firmas de webhooks
 */

import { createHmac, timingSafeEqual } from "crypto";

const LS_API = "https://api.lemonsqueezy.com/v1";

// ---------------------------------------------------------------------------
// Tipos mínimos de la API de LemonSqueezy
// ---------------------------------------------------------------------------

interface LsCheckoutResponse {
  data: {
    id: string;
    attributes: {
      url: string;
      expires_at: string;
    };
  };
}

// ---------------------------------------------------------------------------
// Crear checkout
// ---------------------------------------------------------------------------

/**
 * Crea una sesión de checkout en LemonSqueezy para que una agency pague
 * una PlatformInvoice específica.
 *
 * @returns URL de checkout a la que redirigir al usuario.
 */
export async function createLemonSqueezyCheckout(params: {
  invoiceId: string;
  invoiceNumber: string;
  agencyName: string;
  agencyEmail: string;
  totalAmountUSD: string; // "35.00"
  currency?: string;
  successUrl?: string;
  cancelUrl?: string;
}): Promise<string> {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY;
  const storeId = process.env.LEMONSQUEEZY_STORE_ID;
  const variantId = process.env.LEMONSQUEEZY_VARIANT_ID;

  if (!apiKey || !storeId || !variantId) {
    throw new Error("[LemonSqueezy] Variables de entorno faltantes: LEMONSQUEEZY_API_KEY, LEMONSQUEEZY_STORE_ID, LEMONSQUEEZY_VARIANT_ID");
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const body = {
    data: {
      type: "checkouts",
      attributes: {
        custom_price: Math.round(parseFloat(params.totalAmountUSD) * 100), // en centavos
        product_options: {
          name: `Factura ${params.invoiceNumber}`,
          description: `Pago de suscripción CrystalPyme — ${params.agencyName}`,
          redirect_url: params.successUrl ?? `${appUrl}/admin/billing`,
        },
        checkout_options: {
          button_color: "#6366f1",
        },
        checkout_data: {
          email: params.agencyEmail,
          name: params.agencyName,
          custom: {
            invoice_id: params.invoiceId,
            invoice_number: params.invoiceNumber,
          },
        },
        expires_at: expiresIn(72), // 72 horas
      },
      relationships: {
        store: {
          data: { type: "stores", id: storeId },
        },
        variant: {
          data: { type: "variants", id: variantId },
        },
      },
    },
  };

  const res = await fetch(`${LS_API}/checkouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/vnd.api+json",
      Accept: "application/vnd.api+json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[LemonSqueezy] Error creando checkout ${res.status}: ${text}`);
  }

  const json = (await res.json()) as LsCheckoutResponse;
  return json.data.attributes.url;
}

// ---------------------------------------------------------------------------
// Verificar firma de webhook
// ---------------------------------------------------------------------------

/**
 * Verifica la firma HMAC-SHA256 del webhook de LemonSqueezy.
 * Devuelve false si la firma no coincide o si falta el secret.
 */
export function verifyLemonSqueezySignature(
  rawBody: string,
  signature: string | null
): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const expected = createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  try {
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Tipos del evento webhook
// ---------------------------------------------------------------------------

export interface LsOrderCreatedEvent {
  meta: {
    event_name: "order_created" | string;
    custom_data?: {
      invoice_id?: string;
      invoice_number?: string;
    };
  };
  data: {
    id: string;
    attributes: {
      status: string; // "paid" | "pending" | "refunded" | ...
      total: number;          // en centavos
      currency: string;
      identifier: string;     // número de orden LS
    };
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function expiresIn(hours: number): string {
  const d = new Date();
  d.setHours(d.getHours() + hours);
  return d.toISOString();
}
