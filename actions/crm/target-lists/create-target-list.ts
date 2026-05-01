"use server";
import {
  requireBusinessContext,
  requirePermission,
  tenantPrisma,
} from "@/lib/tenant";
import { revalidatePath } from "next/cache";

export const createTargetList = async (data: {
  name: string;
  description?: string;
  targetIds?: string[];
}) => {
  const { ctx, businessId } = await requireBusinessContext();
  await requirePermission("business.lead.create");
  const db = tenantPrisma(businessId);
  const userId = ctx.userId;

  const { name, description, targetIds = [] } = data;
  if (!name) return { error: "name is required" };

  try {
    const list = await db.crm_TargetLists.create({
      data: {
        businessId,
        name,
        description,
        created_by: userId,
        targets: {
          create: targetIds.map((id: string) => ({ target_id: id })),
        },
      },
      include: { targets: true },
    });
    revalidatePath("/[locale]/(routes)/crm/target-lists", "page");
    return { data: list };
  } catch (error) {
    return { error: "Failed to create target list" };
  }
};
