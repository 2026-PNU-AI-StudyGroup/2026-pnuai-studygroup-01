"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { TeamApplicationInvitationConflictError, TeamApplicationInvitationService } from "@/modules/topic-application/application/manage-team-application-invitations";
import { PrismaTopicApplicationRepository } from "@/modules/topic-application/infrastructure/prisma-topic-application-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type TeamInvitationActionState = { status: "idle" | "success" | "error"; message: string };

const initialSchema = z.object({ invitationId: z.string().uuid(), decision: z.enum(["ACCEPT", "DECLINE"]) });

export async function respondToTeamInvitationAction(_state: TeamInvitationActionState, formData: FormData): Promise<TeamInvitationActionState> {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const parsed = initialSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "처리할 팀 지원 초대를 확인해 주세요." };
  try {
    const outcome = await new TeamApplicationInvitationService(new PrismaTopicApplicationRepository(prisma)).respond(actor, parsed.data.invitationId, parsed.data.decision);
    revalidatePath("/topics");
    revalidatePath("/topics/applications");
    return { status: "success", message: outcome === "APPLICATION_CREATED" ? "모든 팀원이 수락해 교수에게 지원서가 접수되었습니다." : outcome === "DECLINED" ? "팀 지원 초대를 거절했습니다." : "팀 참여를 수락했습니다. 다른 팀원의 응답을 기다립니다." };
  } catch (error) {
    if (error instanceof TeamApplicationInvitationConflictError) return { status: "error", message: error.message };
    throw error;
  }
}

export async function cancelTeamApplicationDraftAction(_state: TeamInvitationActionState, formData: FormData): Promise<TeamInvitationActionState> {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const parsed = z.object({ draftId: z.string().uuid() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "취소할 팀 지원을 확인해 주세요." };
  try {
    await new TeamApplicationInvitationService(new PrismaTopicApplicationRepository(prisma)).cancel(actor, parsed.data.draftId);
    revalidatePath("/topics");
    revalidatePath("/topics/applications");
    return { status: "success", message: "팀 지원 준비와 초대를 취소했습니다." };
  } catch (error) {
    if (error instanceof TeamApplicationInvitationConflictError) return { status: "error", message: error.message };
    throw error;
  }
}
