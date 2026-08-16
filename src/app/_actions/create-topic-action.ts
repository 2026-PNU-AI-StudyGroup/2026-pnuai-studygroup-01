"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentOperationalActor } from "@/modules/identity/infrastructure/operational-actor";
import { PrismaProjectProgramRepository } from "@/modules/project-program/infrastructure/prisma-project-program-repository";
import { CreateTopicService } from "@/modules/topic/application/create-topic";
import { PrismaTopicCommandRepository } from "@/modules/topic/infrastructure/prisma-topic-command-repository";
import { getCreateTopicErrorMessage } from "@/modules/topic/ui/create-topic-error";
import { parseTopicFormData } from "@/modules/topic/ui/create-topic-input";
import type { TopicFormActionState } from "@/modules/topic/ui/topic-form";
import { TopicApprovalOperationError, TopicApprovalService } from "@/modules/topic-approval/application/manage-topic-approvals";
import { PrismaTopicApprovalRepository } from "@/modules/topic-approval/infrastructure/prisma-topic-approval-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

export async function createTopicAction(
  _previousState: TopicFormActionState,
  formData: FormData,
): Promise<TopicFormActionState> {
  const actor = await getCurrentOperationalActor();
  if (!actor) redirect("/sign-in");

  const parsed = parseTopicFormData(formData);
  if (!parsed.success) {
    return { status: "error", message: "프로젝트 내용을 확인해 주세요." };
  }

  if (actor.role === "STUDENT") {
    const approval = z.object({
      approvalRoute: z.enum(["PROFESSOR", "ADMIN"]),
      requestedProfessorId: z.string().uuid().optional(),
      sourceStudentTeamId: z.string().uuid().optional(),
      projectRepresentativeId: z.string().uuid().optional(),
      projectTeamName: z.string().trim().min(1).max(100),
    }).safeParse({
      approvalRoute: formData.get("approvalRoute"),
      requestedProfessorId: formData.get("requestedProfessorId") || undefined,
      sourceStudentTeamId: formData.get("sourceStudentTeamId") || undefined,
      projectRepresentativeId: formData.get("projectRepresentativeId") || undefined,
      projectTeamName: formData.get("projectTeamName"),
    });
    if (!approval.success) {
      return { status: "error", message: "승인 요청 방식을 확인해 주세요." };
    }
    let projectId: string;
    try {
      projectId = await new TopicApprovalService(
        new PrismaTopicApprovalRepository(prisma),
        new PrismaProjectProgramRepository(prisma),
      ).createStudentRegistration(actor, {
        ...parsed.data,
        route: approval.data.approvalRoute,
        requestedProfessorId: approval.data.requestedProfessorId,
        sourceStudentTeamId: approval.data.sourceStudentTeamId,
        projectRepresentativeId: approval.data.projectRepresentativeId,
        projectTeamName: approval.data.projectTeamName,
      });
    } catch (error) {
      if (error instanceof TopicApprovalOperationError) {
        return { status: "error", message: error.message };
      }
      // 도메인 검증 오류(InvalidTopicDetailsError 등)도 500 대신 친절한 메시지로.
      const message = getCreateTopicErrorMessage(error);
      if (message) return { status: "error", message };
      throw error;
    }
    revalidatePath("/dashboard");
    revalidatePath("/topics");
    revalidatePath(`/projects/${projectId}`);
    return { status: "success", message: "프로젝트 승인 요청을 보냈습니다.", projectId };
  }

  try {
    await new CreateTopicService(
      new PrismaTopicCommandRepository(prisma),
      new PrismaProjectProgramRepository(prisma),
    ).execute(actor, parsed.data);
  } catch (error) {
    const message = getCreateTopicErrorMessage(error);
    if (message) return { status: "error", message };
    throw error;
  }

  revalidatePath("/professor/topics");
  return { status: "success", message: "프로젝트 초안이 저장되었습니다." };
}
