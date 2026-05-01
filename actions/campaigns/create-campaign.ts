"use server";
import {
  requireBusinessContext,
  requirePermission,
  tenantPrisma,
} from "@/lib/tenant";

type StepInput = {
  order: number;
  template_id: string;
  subject: string;
  delay_days: number;
  send_to: "all" | "non_openers";
};

export const createCampaign = async (data: {
  name: string;
  description?: string;
  from_name?: string;
  reply_to?: string;
  template_id?: string;
  target_list_ids: string[];
  steps: StepInput[];
  scheduled_at?: Date;
}) => {
  const { ctx, businessId } = await requireBusinessContext();
  await requirePermission("business.lead.create");
  const db = tenantPrisma(businessId);
  const userId = ctx.userId;
  const { target_list_ids, steps, ...campaignData } = data;

  return db.crm_campaigns.create({
    data: {
      ...campaignData,
      businessId,
      v: 0,
      status: data.scheduled_at ? "scheduled" : "draft",
      created_by: userId,
      target_lists: {
        create: target_list_ids.map((id) => ({ target_list_id: id })),
      },
      steps: {
        create: steps.map((s) => ({
          ...s,
          scheduled_at: data.scheduled_at
            ? new Date(data.scheduled_at.getTime() + s.delay_days * 86_400_000)
            : null,
        })),
      },
    },
  });
};
