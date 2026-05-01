"use server";
import {
  requireBusinessContext,
  tenantPrisma,
} from "@/lib/tenant";
import type { Prisma } from "@prisma/client";
import type { ReportCategory } from "./types";

async function getCtx() {
  const { ctx, businessId } = await requireBusinessContext();
  return { userId: ctx.userId, businessId, db: tenantPrisma(businessId) };
}

export async function saveConfig(input: { name: string; category: ReportCategory; filters: Record<string, unknown>; isShared: boolean }) {
  const { userId, businessId, db } = await getCtx();
  return db.crm_Report_Config.create({ data: { businessId, name: input.name, category: input.category, filters: input.filters as Prisma.InputJsonValue, isShared: input.isShared, createdBy: userId } });
}

export async function loadConfigs(category: ReportCategory) {
  const { userId, db } = await getCtx();
  return db.crm_Report_Config.findMany({ where: { category, OR: [{ createdBy: userId }, { isShared: true }] }, orderBy: { createdAt: "desc" } });
}

export async function deleteConfig(configId: string) {
  const { userId, db } = await getCtx();
  return db.crm_Report_Config.delete({ where: { id: configId, createdBy: userId } });
}

export async function duplicateConfig(configId: string, newName: string) {
  const { userId, businessId, db } = await getCtx();
  const original = await db.crm_Report_Config.findMany({ where: { id: configId } });
  if (!original[0]) throw new Error("Config not found");
  return db.crm_Report_Config.create({ data: { businessId, name: newName, category: original[0].category, filters: original[0].filters as Prisma.InputJsonValue, isShared: false, createdBy: userId } });
}

export async function toggleShare(configId: string, isShared: boolean) {
  const { userId, db } = await getCtx();
  return db.crm_Report_Config.update({ where: { id: configId, createdBy: userId }, data: { isShared } });
}
