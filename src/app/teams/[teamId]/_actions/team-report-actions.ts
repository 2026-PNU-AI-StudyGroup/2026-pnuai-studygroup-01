"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentOperationalActor } from "@/modules/identity/infrastructure/operational-actor";
import {
  ArtifactRegistrationService,
  ArtifactManagementService,
  InvalidReportInputError,
  ReportDecisionService,
  ReportFeedbackService,
  ReportOperationNotAllowedError,
  ReportSubmissionService,
} from "@/modules/report/application/manage-reports";
import { PrismaArtifactRepository } from "@/modules/report/infrastructure/prisma-artifact-repository";
import { PrismaReportDecisionRepository } from "@/modules/report/infrastructure/prisma-report-decision-repository";
import { PrismaReportFeedbackRepository } from "@/modules/report/infrastructure/prisma-report-feedback-repository";
import { PrismaReportSubmissionRepository } from "@/modules/report/infrastructure/prisma-report-submission-repository";
import {
  artifactRegistrationSchema,
  artifactRemovalSchema,
  artifactUpdateSchema,
  reportDecisionSchema,
  reportFeedbackSchema,
  reportSubmissionSchema,
} from "@/modules/report/ui/report-input";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type ReportActionState = { status: "idle" | "error" | "success" | "conflict"; message: string };

function message(error: unknown) {
  return error instanceof InvalidReportInputError ||
    error instanceof ReportOperationNotAllowedError
    ? error.message
    : null;
}

export async function submitReportVersionAction(formData: FormData): Promise<ReportActionState> {
  const actor = await getCurrentOperationalActor();
  if (!actor) redirect("/sign-in");
  const parsed = reportSubmissionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "보고서 입력을 확인해 주세요." };
  try {
    const result = await new ReportSubmissionService(
      new PrismaReportSubmissionRepository(prisma),
    ).submit(actor, {
      teamId: parsed.data.teamId,
      reportId: parsed.data.reportId,
      fileId: parsed.data.uploadId,
      description: parsed.data.description,
    });
    revalidatePath(`/teams/${parsed.data.teamId}`, "layout");
    return { status: "success", message: `버전 ${result.version}을 제출했습니다.` };
  } catch (error) {
    const expected = message(error);
    if (expected) return { status: "error", message: expected };
    throw error;
  }
}

export async function decideReportAction(
  _state: ReportActionState,
  formData: FormData,
): Promise<ReportActionState> {
  const actor = await getCurrentOperationalActor();
  if (!actor) redirect("/sign-in");
  const parsed = reportDecisionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "결정 입력을 확인해 주세요." };
  try {
    await new ReportDecisionService(
      new PrismaReportDecisionRepository(prisma),
    ).decide(actor, parsed.data);
    revalidatePath(`/teams/${parsed.data.teamId}`, "layout");
    return { status: "success", message: "검토 결정을 저장했습니다." };
  } catch (error) {
    const expected = message(error);
    if (expected) return { status: "error", message: expected };
    throw error;
  }
}

export async function addReportFeedbackAction(
  _state: ReportActionState,
  formData: FormData,
): Promise<ReportActionState> {
  const actor = await getCurrentOperationalActor();
  if (!actor) redirect("/sign-in");
  const parsed = reportFeedbackSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "피드백 내용을 확인해 주세요." };
  try {
    await new ReportFeedbackService(new PrismaReportFeedbackRepository(prisma)).add(actor, {
      reportId: parsed.data.reportId,
      body: parsed.data.body,
    });
    revalidatePath(`/teams/${parsed.data.teamId}`, "layout");
    return { status: "success", message: "피드백을 남겼습니다." };
  } catch (error) {
    const expected = message(error);
    if (expected) return { status: "error", message: expected };
    throw error;
  }
}

export async function registerArtifactAction(formData: FormData): Promise<ReportActionState> {
  const actor = await getCurrentOperationalActor();
  if (!actor) redirect("/sign-in");
  const values = Object.fromEntries(formData);
  if (values.uploadId === "") delete values.uploadId;
  if (values.externalUrl === "") delete values.externalUrl;
  const parsed = artifactRegistrationSchema.safeParse(values);
  if (!parsed.success) return { status: "error", message: "결과물 입력을 확인해 주세요." };
  try {
    await new ArtifactRegistrationService(
      new PrismaArtifactRepository(prisma),
    ).registerArtifact(actor, {
      teamId: parsed.data.teamId,
      type: parsed.data.type,
      title: parsed.data.title,
      fileId: parsed.data.uploadId,
      externalUrl: parsed.data.externalUrl,
    });
    revalidatePath(`/teams/${parsed.data.teamId}`, "layout");
    return { status: "success", message: "결과물을 등록했습니다." };
  } catch (error) {
    const expected = message(error);
    if (expected) return { status: "error", message: expected };
    throw error;
  }
}

export async function updateArtifactAction(
  _state: ReportActionState,
  formData: FormData,
): Promise<ReportActionState> {
  const actor = await getCurrentOperationalActor();
  if (!actor) redirect("/sign-in");
  const parsed = artifactUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "결과물 정보를 확인해 주세요." };
  try {
    await new ArtifactManagementService(new PrismaArtifactRepository(prisma)).updateArtifact(actor, parsed.data);
    revalidatePath(`/teams/${parsed.data.teamId}`, "layout");
    return { status: "success", message: "결과물 정보를 수정했습니다." };
  } catch (error) {
    const expected = message(error);
    if (expected) return { status: "error", message: expected };
    throw error;
  }
}

export async function removeArtifactAction(
  _state: ReportActionState,
  formData: FormData,
): Promise<ReportActionState> {
  const actor = await getCurrentOperationalActor();
  if (!actor) redirect("/sign-in");
  const parsed = artifactRemovalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "삭제할 결과물을 확인해 주세요." };
  try {
    await new ArtifactManagementService(new PrismaArtifactRepository(prisma)).removeArtifact(actor, parsed.data);
    revalidatePath(`/teams/${parsed.data.teamId}`, "layout");
    return { status: "success", message: "결과물을 삭제했습니다." };
  } catch (error) {
    const expected = message(error);
    if (expected) return { status: "error", message: expected };
    throw error;
  }
}
