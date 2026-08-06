"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ProjectVotingOperationError, ProjectVotingService } from "@/modules/project-voting/application/manage-project-voting";
import { ProjectVotingPolicyError } from "@/modules/project-voting/domain/project-voting-policy";
import { PrismaProjectVotingRepository } from "@/modules/project-voting/infrastructure/prisma-project-voting-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type ProjectVoteActionState = { status: "idle" | "error" | "success"; message: string };

export const initialProjectVoteActionState: ProjectVoteActionState = { status: "idle", message: "" };

export async function saveProjectVotesAction(
  _previousState: ProjectVoteActionState,
  formData: FormData,
): Promise<ProjectVoteActionState> {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const programId = z.string().uuid().safeParse(formData.get("programId"));
  const topicIds = z.array(z.string().uuid()).safeParse(formData.getAll("topicId"));
  if (!programId.success || !topicIds.success) return { status: "error", message: "투표할 프로젝트를 다시 선택해 주세요." };
  try {
    await new ProjectVotingService(new PrismaProjectVotingRepository(prisma)).saveVotes(actor, programId.data, topicIds.data);
  } catch (error) {
    if (error instanceof ProjectVotingOperationError || error instanceof ProjectVotingPolicyError) {
      return { status: "error", message: error.message };
    }
    throw error;
  }
  revalidatePath(`/programs/${programId.data}/vote`);
  revalidatePath(`/admin/programs/${programId.data}/settings`);
  return { status: "success", message: topicIds.data.length ? "투표를 저장했습니다." : "선택한 투표를 모두 취소했습니다." };
}
