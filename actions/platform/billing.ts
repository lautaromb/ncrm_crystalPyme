"use server";

/**
 * actions/platform/billing.ts
 *
 * Server actions para gestión de facturación desde el panel de superadmin.
 *
 * Actions disponibles:
 *   createPaymentLink  — genera un link de pago (LS o MP) para una factura
 *   markInvoicePaidManual — marca la factura como PAID manualmente (fallback)
 *   waiveInvoice       — condona una factura (WAIVED)
 */

import { prismadb } from "@/lib/prisma";
import { requireSuperadmin } from "@/lib/tenant";
import { createLemonSqueezyCheckout } from "@/lib/payments/lemonsqueezy";
import { createMercadoPagoPreference } from "@/lib/payments/mercadopago";
import { markInvoicePaid } from "@/lib/payments/mark-paid";
import { z } from "zod";

// ---------------------------------------------------------------------------
// createPaymentLink
// ---------------------------------------------------------------------------

const createPaymentLinkSchema = z.object({
  invoiceId: z.string().uuid(),
  provider: z.enum(["LEMONSQUEEZY", "MERCADOPAGO"]),
});

export type CreatePaymentLinkInput = z.infer<typeof createPaymentLinkSchema>;

export async function createPaymentLink(input: CreatePaymentLinkInput): Promise<{
  ok: boolean;
  url?: string;
  error?: string;
}> {
  try {
    await requireSuperadmin();

    const parsed = createPaymentLinkSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Input inválido" };
    }

    const { invoiceId, provider } = parsed.data;

    // Cargar la factura con datos de la agency
    const invoice = await prismadb.platformInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        agency: {
          select: {
            name: true,
            owner: { select: { email: true } },
          },
        },
      },
    });

    if (!invoice) return { ok: false, error: "Factura no encontrada" };
    if (invoice.status === "PAID") return { ok: false, error: "La factura ya está pagada" };

    const agencyEmail = invoice.agency.owner.email ?? "";

    if (provider === "LEMONSQUEEZY") {
      const url = await createLemonSqueezyCheckout({
        invoiceId: invoice.id,
        invoiceNumber: invoice.number,
        agencyName: invoice.agency.name,
        agencyEmail,
        totalAmountUSD: invoice.totalAmount.toString(),
      });
      return { ok: true, url };
    }

    if (provider === "MERCADOPAGO") {
      const { checkoutUrl } = await createMercadoPagoPreference({
        invoiceId: invoice.id,
        invoiceNumber: invoice.number,
        agencyName: invoice.agency.name,
        agencyEmail,
        totalAmountARS: invoice.totalAmount.toString(),
      });
      return { ok: true, url: checkoutUrl };
    }

    return { ok: false, error: "Provider no soportado" };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Error inesperado";
    console.error("[createPaymentLink]", error);
    return { ok: false, error };
  }
}

// ---------------------------------------------------------------------------
// markInvoicePaidManual
// ---------------------------------------------------------------------------

const markPaidSchema = z.object({
  invoiceId: z.string().uuid(),
  providerRef: z.string().min(1, "Referencia de pago requerida"),
  notes: z.string().max(500).optional(),
});

export type MarkInvoicePaidManualInput = z.infer<typeof markPaidSchema>;

export async function markInvoicePaidManual(
  input: MarkInvoicePaidManualInput
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireSuperadmin();

    const parsed = markPaidSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Input inválido" };
    }

    const result = await markInvoicePaid({
      invoiceId: parsed.data.invoiceId,
      provider: "MANUAL",
      providerRef: parsed.data.providerRef,
      providerPayload: parsed.data.notes ? { notes: parsed.data.notes } : undefined,
    });

    return result;
  } catch (err) {
    const error = err instanceof Error ? err.message : "Error inesperado";
    console.error("[markInvoicePaidManual]", error);
    return { ok: false, error };
  }
}

// ---------------------------------------------------------------------------
// waiveInvoice
// ---------------------------------------------------------------------------

export async function waiveInvoice(
  invoiceId: string,
  reason?: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireSuperadmin();

    if (!invoiceId) return { ok: false, error: "invoiceId requerido" };

    const invoice = await prismadb.platformInvoice.findUnique({
      where: { id: invoiceId },
      select: { id: true, status: true },
    });

    if (!invoice) return { ok: false, error: "Factura no encontrada" };
    if (invoice.status === "PAID") return { ok: false, error: "No se puede condonar una factura ya pagada" };

    await prismadb.platformInvoice.update({
      where: { id: invoiceId },
      data: {
        status: "WAIVED",
        notes: reason ?? null,
      },
    });

    return { ok: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Error inesperado";
    console.error("[waiveInvoice]", error);
    return { ok: false, error };
  }
}
