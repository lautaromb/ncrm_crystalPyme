"use server";
import {
  requireBusinessContext,
  requirePermission,
  tenantPrisma,
} from "@/lib/tenant";

export const createTemplate = async (data: {
  name: string;
  description?: string;
  subject_default?: string;
  content_html: string;
  content_json: object;
}) => {
  const { ctx, businessId } = await requireBusinessContext();
  await requirePermission("business.lead.create");
  const db = tenantPrisma(businessId);
  const userId = ctx.userId;
  return db.crm_campaign_templates.create({
    data: { ...data, businessId, created_by: userId },
  });
};
