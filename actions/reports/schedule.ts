"use server";
import {
  requireBusinessContext,
  tenantPrisma,
} from "@/lib/tenant";
import type { ExportFormat } from "./types";

async function getCtx() {
  const { ctx, businessId } = await requireBusinessContext();
  return { userId: ctx.userId, businessId, db: tenantPrisma(businessId) };
}

export async function createSchedule(input: { reportConfigId: string; cronExpression: string; recipients: string[]; format: ExportFormat }) {
  const { userId, businessId, db } = await getCtx();
  return db.crm_Report_Schedule.create({ data: { businessId, reportConfigId: input.reportConfigId, cronExpression: input.cronExpression, recipients: input.recipients, format: input.format, createdBy: userId } });
}

export async function listSchedules() {
  const { userId, db } = await getCtx();
  return db.crm_Report_Schedule.findMany({ where: { createdBy: userId }, include: { reportConfig: true }, orderBy: { createdAt: "desc" } });
}

export async function updateSchedule(scheduleId: string, data: { cronExpression?: string; recipients?: string[]; format?: ExportFormat; isActive?: boolean }) {
  const { userId, db } = await getCtx();
  return db.crm_Report_Schedule.update({ where: { id: scheduleId, createdBy: userId }, data });
}

export async function deleteSchedule(scheduleId: string) {
  const { userId, db } = await getCtx();
  return db.crm_Report_Schedule.delete({ where: { id: scheduleId, createdBy: userId } });
}
