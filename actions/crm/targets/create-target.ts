"use server";
import {
  requireBusinessContext,
  requirePermission,
  tenantPrisma,
} from "@/lib/tenant";
import { revalidatePath } from "next/cache";

export const createTarget = async (data: {
  last_name?: string;
  first_name?: string;
  email?: string;
  mobile_phone?: string;
  office_phone?: string;
  company?: string;
  company_website?: string;
  personal_website?: string;
  position?: string;
  social_x?: string;
  social_linkedin?: string;
  social_instagram?: string;
  social_facebook?: string;
  status?: boolean;
}) => {
  const { ctx, businessId } = await requireBusinessContext();
  await requirePermission("business.lead.create");
  const db = tenantPrisma(businessId);
  const userId = ctx.userId;

  const { last_name, email, mobile_phone, ...rest } = data;
  if (!last_name && !data.company) return { error: "last_name or company is required" };

  try {
    const target = await db.crm_Targets.create({
      data: { businessId, last_name: last_name ?? "", email, mobile_phone, ...rest, created_by: userId },
    });
    revalidatePath("/[locale]/(routes)/crm/targets", "page");
    return { data: target };
  } catch (error) {
    return { error: "Failed to create target" };
  }
};
