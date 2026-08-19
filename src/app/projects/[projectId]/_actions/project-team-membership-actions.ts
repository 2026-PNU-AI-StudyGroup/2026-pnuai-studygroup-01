"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import {
  ProjectTeamMembershipOperationError,
  ProjectTeamMembershipService,
} from "@/modules/project-team/application/manage-project-team-membership";
import { PrismaProjectTeamMembershipRepository } from "@/modules/project-team/infrastructure/prisma-project-team-membership-repository";
import { userIdSchema } from "@/modules/identity/domain/user-id";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type ProjectTeamMembershipActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function projectTeamMembershipAction(
  _state: ProjectTeamMembershipActionState,
  formData: FormData,
): Promise<ProjectTeamMembershipActionState> {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const parsed = z.object({
    projectId: z.string().uuid(),
    projectTeamId: z.string().uuid(),
    intent: z.enum(["LEAVE", "REMOVE", "TRANSFER", "REMOVE_LEADER"]),
    targetUserId: userIdSchema.optional(),
    nextLeaderId: userIdSchema.optional(),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "팀원 변경 내용을 확인해 주세요." };
  if (parsed.data.intent === "REMOVE_LEADER" && (
    !parsed.data.targetUserId ||
    !parsed.data.nextLeaderId ||
    parsed.data.targetUserId === parsed.data.nextLeaderId
  )) return { status: "error", message: "인계할 팀장을 다시 선택해 주세요." };
  const service = new ProjectTeamMembershipService(
    new PrismaProjectTeamMembershipRepository(prisma),
  );
  try {
    if (parsed.data.intent === "LEAVE") {
      await service.leave(actor, parsed.data.projectTeamId);
    } else if (parsed.data.intent === "REMOVE" && parsed.data.targetUserId) {
      await service.remove(actor, parsed.data.projectTeamId, parsed.data.targetUserId);
    } else if (parsed.data.intent === "TRANSFER" && parsed.data.targetUserId) {
      await service.transferLeadership(actor, parsed.data.projectTeamId, parsed.data.targetUserId);
    } else if (parsed.data.intent === "REMOVE_LEADER" && parsed.data.targetUserId && parsed.data.nextLeaderId) {
      await service.removeLeaderAndTransfer(actor, parsed.data.projectTeamId, parsed.data.targetUserId, parsed.data.nextLeaderId);
    } else {
      return { status: "error", message: "대상 팀원을 선택해 주세요." };
    }
  } catch (error) {
    if (error instanceof ProjectTeamMembershipOperationError) {
      return { status: "error", message: error.message };
    }
    throw error;
  }
  revalidatePath(`/projects/${parsed.data.projectId}`);
  revalidatePath("/dashboard");
  if (parsed.data.intent === "LEAVE" || (parsed.data.intent === "REMOVE_LEADER" && parsed.data.targetUserId === actor.id)) {
    redirect("/dashboard");
  }
  return { status: "success", message: "프로젝트 팀 구성을 변경했습니다." };
}
