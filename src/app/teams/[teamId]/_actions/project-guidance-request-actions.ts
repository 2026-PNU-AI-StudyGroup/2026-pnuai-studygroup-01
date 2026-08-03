"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentOperationalActor } from "@/modules/identity/infrastructure/operational-actor";
import {
  PendingProjectGuidanceRequestExistsError,
  ProjectGuidanceRequestNotAllowedError,
  ProjectGuidanceRequestService,
} from "@/modules/project-guidance-request/application/manage-project-guidance-requests";
import { InvalidProjectGuidanceRequestError } from "@/modules/project-guidance-request/domain/project-guidance-request-policy";
import { PrismaProjectGuidanceRequestRepository } from "@/modules/project-guidance-request/infrastructure/prisma-project-guidance-request-repository";
import {
  cancelProjectGuidanceRequestSchema,
  createProjectGuidanceRequestSchema,
  respondProjectGuidanceRequestSchema,
} from "@/modules/project-guidance-request/ui/project-guidance-request-input";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type ProjectGuidanceActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

function guidanceRequestService() {
  return new ProjectGuidanceRequestService(
    new PrismaProjectGuidanceRequestRepository(prisma),
  );
}

function expectedMessage(error: unknown): string | null {
  return error instanceof InvalidProjectGuidanceRequestError ||
    error instanceof PendingProjectGuidanceRequestExistsError ||
    error instanceof ProjectGuidanceRequestNotAllowedError
    ? error.message
    : null;
}

function revalidateRequestSurfaces(teamId: string) {
  revalidatePath(`/teams/${teamId}/requests`);
  revalidatePath(`/teams/${teamId}`, "layout");
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
}

export async function createProjectGuidanceRequestAction(
  _state: ProjectGuidanceActionState,
  formData: FormData,
): Promise<ProjectGuidanceActionState> {
  const actor = await getCurrentOperationalActor();
  if (!actor) redirect("/sign-in");
  const parsed = createProjectGuidanceRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "요청 입력을 확인해 주세요." };
  }
  try {
    await guidanceRequestService().create(actor, parsed.data);
  } catch (error) {
    const message = expectedMessage(error);
    if (message) return { status: "error", message };
    throw error;
  }
  revalidateRequestSurfaces(parsed.data.teamId);
  return { status: "success", message: "요청을 보냈습니다." };
}

export async function respondProjectGuidanceRequestAction(
  _state: ProjectGuidanceActionState,
  formData: FormData,
): Promise<ProjectGuidanceActionState> {
  const actor = await getCurrentOperationalActor();
  if (!actor) redirect("/sign-in");
  const parsed = respondProjectGuidanceRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "답변 입력을 확인해 주세요." };
  }
  try {
    await guidanceRequestService().respond(actor, parsed.data);
  } catch (error) {
    const message = expectedMessage(error);
    if (message) return { status: "error", message };
    throw error;
  }
  revalidateRequestSurfaces(parsed.data.teamId);
  return { status: "success", message: "답변을 보냈습니다." };
}

export async function cancelProjectGuidanceRequestAction(
  _state: ProjectGuidanceActionState,
  formData: FormData,
): Promise<ProjectGuidanceActionState> {
  const actor = await getCurrentOperationalActor();
  if (!actor) redirect("/sign-in");
  const parsed = cancelProjectGuidanceRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "취소할 요청을 확인해 주세요." };
  }
  try {
    await guidanceRequestService().cancel(actor, parsed.data.requestId);
  } catch (error) {
    const message = expectedMessage(error);
    if (message) return { status: "error", message };
    throw error;
  }
  revalidateRequestSurfaces(parsed.data.teamId);
  return { status: "success", message: "요청을 취소했습니다." };
}
