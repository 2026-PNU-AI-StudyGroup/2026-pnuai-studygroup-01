"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import {
  ProjectVotingOperationError,
  ProjectVotingService,
  voteScopeLabel,
} from "@/modules/project-voting/application/manage-project-voting";
import { ProjectVotingPolicyError } from "@/modules/project-voting/domain/project-voting-policy";
import { PrismaProjectVotingRepository } from "@/modules/project-voting/infrastructure/prisma-project-voting-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type ToggleProjectVoteActionState = {
  status: "error" | "success";
  message: string;
  selectedTopicIds?: string[];
};

const toggleInputSchema = z.object({
  programId: z.string().uuid(),
  topicId: z.string().uuid(),
  intent: z.enum(["ADD", "REMOVE"]),
});

// 화면이 보고 있던 상태에서 사용자가 무엇을 하려 했는지(넣기/빼기)를 그대로 넘긴다.
// 다음 표 집합을 여기서 계산해 넘기면 그 계산의 근거가 저장 트랜잭션 밖 읽기가 되고,
// "뒤집어라" 로 넘기면 탭 두 개가 같은 버튼을 눌렀을 때 나중 요청이 먼저 들어간 표를 지운다.
export async function toggleProjectVoteAction(input: { programId: string; topicId: string; intent: "ADD" | "REMOVE" }): Promise<ToggleProjectVoteActionState> {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const parsed = toggleInputSchema.safeParse(input);
  if (!parsed.success) return { status: "error", message: "투표할 프로젝트를 다시 선택해 주세요." };

  const service = new ProjectVotingService(new PrismaProjectVotingRepository(prisma));
  try {
    const saved = await service.setVote(actor, parsed.data.programId, parsed.data.topicId, parsed.data.intent);
    revalidatePath("/topics");
    const scopeLabel = voteScopeLabel(saved.scope);
    return {
      status: "success",
      message: saved.voted
        ? `${scopeLabel}에서 ${saved.remainingVotes}표 남았습니다.`
        : `${scopeLabel} 투표를 취소했습니다. ${saved.remainingVotes}표 남았습니다.`,
      selectedTopicIds: saved.selectedTopicIds,
    };
  } catch (error) {
    if (error instanceof ProjectVotingOperationError || error instanceof ProjectVotingPolicyError) {
      return { status: "error", message: error.message };
    }
    throw error;
  }
}
