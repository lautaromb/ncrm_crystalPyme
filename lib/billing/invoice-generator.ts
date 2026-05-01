/**
 * lib/billing/invoice-generator.ts
 *
 * Helper que arma la estructura de una PlatformInvoice antes de persistirla.
 * El job de Inngest lo llama y luego hace el $transaction.
 */

import { prismadb } from "@/lib/prisma";
import Decimal from "decimal.js";
import { calculateRevenueShare, REVENUE_SHARE_PERCENT } from "./revenue-share";

/** Días de vencimiento desde la fecha de emisión. */
const PAYMENT_DUE_DAYS = Number(process.env.PLATFORM_INVOICE_DUE_DAYS ?? "30");

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface InvoiceLineItem {
  description: string;
  businessId?: string;
  quantity: number;
  unitPrice: Decimal;
  amount: Decimal;
}

export interface GeneratedInvoice {
  number: string;
  periodStart: Date;
  periodEnd: Date;
  agencyPlanFee: Decimal;
  revenueShare: Decimal;
  subtotal: Decimal;
  taxAmount: Decimal;
  totalAmount: Decimal;
  currency: string;
  dueDate: Date;
  lineItems: InvoiceLineItem[];
}

// ---------------------------------------------------------------------------
// Número de factura
// ---------------------------------------------------------------------------

/**
 * Genera el próximo número de factura con formato PLAT-YYYY-NNNN.
 * Usa count+1 sobre facturas del mismo año para garantizar secuencia.
 */
async function nextInvoiceNumber(year: number): Promise<string> {
  const prefix = `PLAT-${year}-`;

  const count = await prismadb.platformInvoice.count({
    where: {
      number: { startsWith: prefix },
    },
  });

  const seq = String(count + 1).padStart(4, "0");
  return `${prefix}${seq}`;
}

// ---------------------------------------------------------------------------
// Generador principal
// ---------------------------------------------------------------------------

/**
 * Construye la estructura completa de una factura para una agency.
 * NO escribe en la DB — eso lo hace el job de Inngest en un $transaction.
 *
 * @param agencyId    UUID de la agency
 * @param periodStart Inicio del período facturado (ej: 2026-04-01T00:00:00Z)
 * @param periodEnd   Fin del período facturado (ej: 2026-04-30T23:59:59Z)
 */
export async function generatePlatformInvoice(
  agencyId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<GeneratedInvoice> {
  // 1. Cargar la agency con su plan
  const agency = await prismadb.agency.findUniqueOrThrow({
    where: { id: agencyId },
    select: {
      plan: {
        select: { name: true, priceUSD: true },
      },
    },
  });

  // 2. Revenue share sobre businesses activos
  const rs = await calculateRevenueShare(agencyId);

  // 3. Line items
  const lineItems: InvoiceLineItem[] = [];

  const agencyPlanFee = new Decimal(agency.plan.priceUSD.toString());

  // Fee fijo del plan de la agency
  lineItems.push({
    description: `Suscripción ${agency.plan.name} — ${formatPeriod(periodStart)}`,
    quantity: 1,
    unitPrice: agencyPlanFee,
    amount: agencyPlanFee,
  });

  // Revenue share: un ítem por business activo
  for (const item of rs.items) {
    lineItems.push({
      description: `Revenue share ${REVENUE_SHARE_PERCENT}% — ${item.businessName} (${item.planName})`,
      businessId: item.businessId,
      quantity: 1,
      unitPrice: item.shareAmount,
      amount: item.shareAmount,
    });
  }

  // 4. Totales
  const revenueShare = rs.revenueShare;
  const subtotal = agencyPlanFee.add(revenueShare);
  const taxAmount = new Decimal(0); // IVA/impuestos: fase futura
  const totalAmount = subtotal.add(taxAmount);

  // 5. Número y fechas
  const issueDate = new Date();
  const number = await nextInvoiceNumber(issueDate.getFullYear());
  const dueDate = new Date(issueDate);
  dueDate.setDate(dueDate.getDate() + PAYMENT_DUE_DAYS);

  return {
    number,
    periodStart,
    periodEnd,
    agencyPlanFee,
    revenueShare,
    subtotal,
    taxAmount,
    totalAmount,
    currency: "USD",
    dueDate,
    lineItems,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPeriod(periodStart: Date): string {
  const months = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
  ];
  return `${months[periodStart.getMonth()]} ${periodStart.getFullYear()}`;
}
