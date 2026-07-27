"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { PrismaProjectProgramRepository } from "@/modules/project-program/infrastructure/prisma-project-program-repository";
import { TopicApprovalOperationError, TopicApprovalService } from "@/modules/topic-approval/application/manage-topic-approvals";
import { PrismaTopicApprovalRepository } from "@/modules/topic-approval/infrastructure/prisma-topic-approval-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type TopicApprovalActionState = { status: "idle" | "success" | "error"; message: string };

export async function decideTopicApprovalAction(_state: TopicApprovalActionState, formData: FormData): Promise<TopicApprovalActionState> {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const parsed = z.object({ requestId: z.string().uuid(), decision: z.enum(["APPROVE", "REJECT"]), reviewComment: z.string().max(1000) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "승인 결정을 확인해 주세요." };
  try {
    await new TopicApprovalService(new PrismaTopicApprovalRepository(prisma), new PrismaProjectProgramRepository(prisma)).decide(actor, parsed.data);
  } catch (error) {
    if (error instanceof TopicApprovalOperationError) return { status: "error", message: error.message };
    throw error;
  }
  revalidatePath("/project-approvals");
  revalidatePath("/dashboard");
  revalidatePath("/topics");
  return { status: "success", message: parsed.data.decision === "APPROVE" ? "프로젝트를 승인하고 공개했습니다." : "프로젝트 요청을 반려했습니다." };
}
