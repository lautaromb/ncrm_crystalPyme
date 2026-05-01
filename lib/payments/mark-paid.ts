/**
 * lib/payments/mark-paid.ts
 *
 * Helper compartido: marca una PlatformInvoice como PAID y actualiza
 * el estado de la agency correspondiente.
 *
 * Lo usan los webhooks de LemonSqueezy, Mercado Pago y la action manual.
 */

import { prismadb } from "@/lib/prisma";
import { PaymentProvider } from "@prisma/client";

export interface MarkPaidParams {
  invoiceId: string;
  provider: PaymentProvider;
  providerRef: string;       // ID externo del pago (ej: ls_xxx, mp_xxx)
  providerPayload?: object;  // payload completo del webhook (para auditoría)
  paidAt?: Date;
}

/**
 * Marca la factura como PAID en transacción:
 *   1. PlatformInvoice → status PAID, paidAt, providerRef, providerPayload
 *   2. Agency → si estaba PAST_DUE o SUSPENDED, vuelve a ACTIVE
 *
 * Idempotente: si la factura ya está PAID, no hace nada y devuelve ok.
 */
export async function markInvoicePaid(params: MarkPaidParams): Promise<{
  ok: boolean;
  alreadyPaid?: boolean;
  error?: string;
}> {
  try {
    const invoice = await prismadb.platformInvoice.findUnique({
      where: { id: params.invoiceId },
      select: { id: true, status: true, agencyId: true },
    });

    if (!invoice) {
      return { ok: false, error: `Factura ${params.invoiceId} no encontrada` };
    }

    if (invoice.status === "PAID") {
      return { ok: true, alreadyPaid: true };
    }

    const paidAt = params.paidAt ?? new Date();

    await prismadb.$transaction([
      // 1. Marcar factura pagada
      prismadb.platformInvoice.update({
        where: { id: params.invoiceId },
        data: {
          status: "PAID",
          paidAt,
          provider: params.provider,
          providerRef: params.providerRef,
          providerPayload: params.providerPayload
            ? (params.providerPayload as object)
            : undefined,
        },
      }),

      // 2. Reactivar agency si estaba en estado problemático
      prismadb.agency.update({
        where: { id: invoice.agencyId },
        data: {
          status: "ACTIVE",
          suspendedAt: null,
          // Programar próxima factura en 1 mes desde hoy
          nextInvoiceAt: nextMonthFirst(),
        },
      }),

      // 3. Reactivar businesses ORPHANED de esta agency (pago reintegra los negocios)
      prismadb.business.updateMany({
        where: {
          agencyId: invoice.agencyId,
          status: "ORPHANED",
        },
        data: {
          status: "ACTIVE",
          orphanedAt: null,
          suspendedAt: null,
        },
      }),
    ]);

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[mark-invoice-paid] Error:", message);
    return { ok: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function nextMonthFirst(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}
