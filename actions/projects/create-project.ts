"use server";
import { prismadb } from "@/lib/prisma";
import {
  requireBusinessContext,
  requirePermission,
  tenantPrisma,
} from "@/lib/tenant";
import { revalidatePath } from "next/cache";

export const createProject = async (data: {
  title: string;
  description: string;
  visibility: string;
}) => {
  const { ctx, businessId } = await requireBusinessContext();
  await requirePermission("business.board.manage");
  const db = tenantPrisma(businessId);
  const userId = ctx.userId;

  const { title, description, visibility } = data;
  if (!title) return { error: "Missing project name" };
  if (!description) return { error: "Missing project description" };

  try {
    const boardsCount = await db.boards.count();

    const newBoard = await db.boards.create({
      data: {
        businessId,
        v: 0,
        user: userId,
        title,
        description,
        position: boardsCount > 0 ? boardsCount : 0,
        visibility,
        sharedWith: [userId],
        createdBy: userId,
      },
    });

    await prismadb.sections.create({
      data: {
        v: 0,
        board: newBoard.id,
        title: "Backlog",
        position: 0,
      },
    });

    revalidatePath("/[locale]/(routes)/projects", "page");
    return { data: newBoard };
  } catch (error) {
    console.log("[CREATE_PROJECT]", error);
    return { error: "Failed to create project" };
  }
};
