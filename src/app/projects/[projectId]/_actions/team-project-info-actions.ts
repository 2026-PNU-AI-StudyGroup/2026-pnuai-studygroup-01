"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentOperationalActor } from "@/modules/identity/infrastructure/operational-actor";
import {
  TeamProjectInfoForbiddenError,
  TeamProjectInfoNotFoundError,
  TeamProjectInfoNotInProgressError,
  TeamProjectInfoService,
} from "@/modules/team/application/manage-team-project-info";
import { InvalidTeamProjectInfoError } from "@/modules/team/domain/team-project-info-policy";
import { PrismaTeamProjectInfoRepository } from "@/modules/team/infrastructure/prisma-team-project-info-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type TeamProjectInfoActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

const inputSchema = z.object({
  teamId: z.string().uuid(),
  title: z.string(),
  description: z.string(),
});

export async function updateTeamProjectInfoAction(
  _state: TeamProjectInfoActionState,
  formData: FormData,
): Promise<TeamProjectInfoActionState> {
  const actor = await getCurrentOperationalActor();
  if (!actor) redirect("/sign-in");
  const input = inputSchema.safeParse(Object.fromEntries(formData));
  if (!input.success) {
    return { status: "error", message: "프로젝트 정보를 다시 확인해 주세요." };
  }
  try {
    await new TeamProjectInfoService(
      new PrismaTeamProjectInfoRepository(prisma),
    ).update(actor, input.data.teamId, input.data);
  } catch (error) {
    if (
      error instanceof TeamProjectInfoForbiddenError ||
      error instanceof TeamProjectInfoNotFoundError ||
      error instanceof TeamProjectInfoNotInProgressError ||
      error instanceof InvalidTeamProjectInfoError
    ) {
      return { status: "error", message: error.message };
    }
    throw error;
  }
  revalidatePath("/projects", "layout");
  revalidatePath("/dashboard");
  revalidatePath("/topics");
  revalidatePath("/professor/topics");
  return { status: "success", message: "프로젝트 정보를 수정했습니다." };
}
