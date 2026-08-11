"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ProjectVotingOperationError, ProjectVotingService } from "@/modules/project-voting/application/manage-project-voting";
import { ProjectVotingPolicyError } from "@/modules/project-voting/domain/project-voting-policy";
import { PrismaProjectVotingRepository } from "@/modules/project-voting/infrastructure/prisma-project-voting-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type ToggleProjectVoteActionState = {
  status: "error" | "success";
  message: string;
  selectedTopicIds?: string[];
  remainingVotes?: number;
};

const toggleInputSchema = z.object({
  programId: z.string().uuid(),
  topicId: z.string().uuid(),
});

export async function toggleProjectVoteAction(input: { programId: string; topicId: string }): Promise<ToggleProjectVoteActionState> {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const parsed = toggleInputSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "투표할 프로젝트를 다시 선택해 주세요." };
  const service = new ProjectVotingService(new PrismaProjectVotingRepository(prisma));
  const ballot = await service.getBallot(actor, parsed.data.programId);
  if (!ballot) return { status: "error", message: "투표 설정이 없는 프로그램입니다." };
  if (ballot.phase !== "OPEN") return { status: "error", message: "현재 투표 가능한 기간이 아닙니다." };
  const candidate = ballot.candidates.find(({ id }) => id === parsed.data.topicId);
  if (!candidate) return { status: "error", message: "공개 이력이 있는 같은 프로그램 프로젝트만 선택할 수 있습니다." };
  if (!ballot.policy.selfVotingAllowed && candidate.isSelfProject) {
    return { status: "error", message: "자기 프로젝트에는 투표할 수 없습니다." };
  }

  const selectedTopicIds = new Set(ballot.selectedTopicIds);
  const selected = selectedTopicIds.has(candidate.id);
  if (selected) selectedTopicIds.delete(candidate.id);
  else if (selectedTopicIds.size >= ballot.policy.voteLimit) {
    return { status: "error", message: "인당 가능 투표수를 초과했습니다.", remainingVotes: 0 };
  } else selectedTopicIds.add(candidate.id);

  const nextSelectedTopicIds = [...selectedTopicIds];
  try {
    await service.saveVotes(actor, parsed.data.programId, nextSelectedTopicIds);
  } catch (error) {
    if (error instanceof ProjectVotingOperationError || error instanceof ProjectVotingPolicyError) {
      return { status: "error", message: error.message };
    }
    throw error;
  }
  revalidatePath("/topics");
  revalidatePath(`/admin/programs/${parsed.data.programId}`);
  return {
    status: "success",
    message: selected ? "선택한 투표를 취소했습니다." : "투표를 저장했습니다.",
    selectedTopicIds: nextSelectedTopicIds,
    remainingVotes: ballot.policy.voteLimit - nextSelectedTopicIds.length,
  };
}
