"use server";
import {
  requireBusinessContext,
  requirePermission,
  tenantPrisma,
} from "@/lib/tenant";
import { revalidatePath } from "next/cache";
import { inngest } from "@/inngest/client";
import { writeAuditLog } from "@/lib/audit-log";

export const createAccount = async (data: {
  name: string;
  office_phone?: string;
  website?: string;
  fax?: string;
  company_id?: string;
  vat?: string;
  email?: string;
  billing_street?: string;
  billing_postal_code?: string;
  billing_city?: string;
  billing_state?: string;
  billing_country?: string;
  shipping_street?: string;
  shipping_postal_code?: string;
  shipping_city?: string;
  shipping_state?: string;
  shipping_country?: string;
  description?: string;
  assigned_to?: string;
  status?: string;
  annual_revenue?: string;
  member_of?: string;
  industry?: string;
}) => {
  const { ctx, businessId } = await requireBusinessContext();
  await requirePermission("business.contact.create");
  const db = tenantPrisma(businessId);
  const userId = ctx.userId;

  const { name } = data;
  if (!name) return { error: "name is required" };

  try {
    const account = await db.crm_Accounts.create({
      data: {
        businessId,
        v: 0,
        createdBy: userId,
        updatedBy: userId,
        ...data,
        status: "Active",
      },
    });
    await writeAuditLog({
      entityType: "account",
      entityId: account.id,
      action: "created",
      changes: null,
      userId,
    });
    void inngest.send({ name: "crm/account.saved", data: { record_id: account.id } });
    revalidatePath("/[locale]/(routes)/crm/accounts", "page");
    return { data: account };
  } catch (error) {
    console.log("[CREATE_ACCOUNT]", error);
    return { error: "Failed to create account" };
  }
};
