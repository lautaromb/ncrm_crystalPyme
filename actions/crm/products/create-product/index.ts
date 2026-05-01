"use server";
import {
  requireBusinessContext,
  requirePermission,
  tenantPrisma,
} from "@/lib/tenant";
import { CreateProduct } from "./schema";
import { InputType, ReturnType } from "./types";
import { createSafeAction } from "@/lib/create-safe-action";
import { writeAuditLog } from "@/lib/audit-log";
import { revalidatePath } from "next/cache";

const handler = async (data: InputType): Promise<ReturnType> => {
  const { ctx, businessId } = await requireBusinessContext();
  await requirePermission("business.opportunity.manage");
  const db = tenantPrisma(businessId);
  const userId = ctx.userId;

  const {
    name, description, sku, type, status, unit_price, unit_cost,
    currency, tax_rate, unit, is_recurring, billing_period, categoryId,
  } = data;

  if (is_recurring && !billing_period) {
    return { error: "Billing period is required for recurring products" };
  }

  try {
    if (sku) {
      const existing = await db.crm_Products.findFirst({ where: { sku } });
      if (existing) {
        return { error: `A product with SKU "${sku}" already exists` };
      }
    }

    const product = await db.crm_Products.create({
      data: {
        businessId,
        name,
        description: description || undefined,
        sku: sku || undefined,
        type,
        status: status || "DRAFT",
        unit_price: parseFloat(unit_price),
        unit_cost: unit_cost ? parseFloat(unit_cost) : undefined,
        currency,
        tax_rate: tax_rate ? parseFloat(tax_rate) : undefined,
        unit: unit || undefined,
        is_recurring: is_recurring || false,
        billing_period: is_recurring ? billing_period : undefined,
        categoryId: categoryId || undefined,
        createdBy: userId,
        updatedBy: userId,
      },
    });

    await writeAuditLog({
      entityType: "product",
      entityId: product.id,
      action: "created",
      changes: null,
      userId,
    });

    revalidatePath("/[locale]/(routes)/crm/products", "page");
    return { data: { id: product.id, name: product.name } };
  } catch (error) {
    console.log("[CREATE_PRODUCT]", error);
    return { error: "Failed to create product" };
  }
};

export const createProduct = createSafeAction(CreateProduct, handler);
