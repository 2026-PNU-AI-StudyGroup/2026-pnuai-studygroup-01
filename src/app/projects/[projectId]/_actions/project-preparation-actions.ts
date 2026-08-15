"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentOperationalActor } from "@/modules/identity/infrastructure/operational-actor";
import { ProjectPreparationOperationError, ProjectPreparationService } from "@/modules/topic-approval/application/manage-project-preparation";
import { PrismaProjectPreparationRepository } from "@/modules/topic-approval/infrastructure/prisma-project-preparation-repository";
import { InvalidTeamProjectInfoError } from "@/modules/team/domain/team-project-info-policy";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type ProjectPreparationActionState = { status: "idle" | "error" | "success"; message: string };

const inputSchema = z.object({
  projectId: z.string().uuid(),
  projectTeamName: z.string(),
  projectRepresentativeId: z.string().uuid(),
  title: z.string(),
  description: z.string(),
});

export async function updateProjectPreparationAction(
  _state: ProjectPreparationActionState,
  formData: FormData,
): Promise<ProjectPreparationActionState> {
  const actor = await getCurrentOperationalActor();
  if (!actor) redirect("/sign-in");
  const input = inputSchema.safeParse(Object.fromEntries(formData));
  if (!input.success) return { status: "error", message: "프로젝트 준비 정보를 다시 확인해 주세요." };
  try {
    await new ProjectPreparationService(new PrismaProjectPreparationRepository(prisma)).update(actor, input.data);
  } catch (error) {
    if (error instanceof ProjectPreparationOperationError || error instanceof InvalidTeamProjectInfoError) {
      return { status: "error", message: error.message };
    }
    throw error;
  }
  revalidatePath(`/projects/${input.data.projectId}`);
  revalidatePath("/dashboard");
  revalidatePath("/topics");
  return { status: "success", message: "프로젝트 준비 정보를 저장했습니다." };
}
