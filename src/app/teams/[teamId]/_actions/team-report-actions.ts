"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentOperationalActor } from "@/modules/identity/infrastructure/operational-actor";
import {
  ArtifactRegistrationService,
  InvalidReportInputError,
  ReportDecisionService,
  ReportOperationNotAllowedError,
  ReportRequirementService,
  ReportSubmissionService,
} from "@/modules/report/application/manage-reports";
import { PrismaArtifactRepository } from "@/modules/report/infrastructure/prisma-artifact-repository";
import { PrismaReportDecisionRepository } from "@/modules/report/infrastructure/prisma-report-decision-repository";
import { PrismaReportRequirementRepository } from "@/modules/report/infrastructure/prisma-report-requirement-repository";
import { PrismaReportSubmissionRepository } from "@/modules/report/infrastructure/prisma-report-submission-repository";
import {
  artifactRegistrationSchema,
  reportDecisionSchema,
  reportRequirementRemovalSchema,
  reportRequirementSchema,
  reportSubmissionSchema,
} from "@/modules/report/ui/report-input";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type ReportActionState = { status: "idle" | "error" | "success"; message: string };

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
      type: parsed.data.type,
      fileId: parsed.data.uploadId,
      description: parsed.data.description,
    });
    revalidatePath(`/teams/${parsed.data.teamId}`, "layout");
    return { status: "success", message: `${result.version}차 버전을 제출했습니다.` };
  } catch (error) {
    const expected = message(error);
    if (expected) return { status: "error", message: expected };
    throw error;
  }
}

export async function setReportRequirementAction(
  _state: ReportActionState,
  formData: FormData,
): Promise<ReportActionState> {
  const actor = await getCurrentOperationalActor();
  if (!actor) redirect("/sign-in");
  const parsed = reportRequirementSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "보고서 종류와 기한을 확인해 주세요." };
  try {
    await new ReportRequirementService(
      new PrismaReportRequirementRepository(prisma),
    ).setRequirement(actor, parsed.data);
    revalidatePath(`/teams/${parsed.data.teamId}`, "layout");
    return { status: "success", message: "보고서 요구사항과 기한을 저장했습니다." };
  } catch (error) {
    const expected = message(error);
    if (expected) return { status: "error", message: expected };
    throw error;
  }
}

export async function removeReportRequirementAction(
  _state: ReportActionState,
  formData: FormData,
): Promise<ReportActionState> {
  const actor = await getCurrentOperationalActor();
  if (!actor) redirect("/sign-in");
  const parsed = reportRequirementRemovalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "해제할 보고서 요구사항을 확인해 주세요." };
  try {
    await new ReportRequirementService(
      new PrismaReportRequirementRepository(prisma),
    ).removeRequirement(actor, parsed.data);
    revalidatePath(`/teams/${parsed.data.teamId}`, "layout");
    return { status: "success", message: "보고서 요구사항을 해제했습니다." };
  } catch (error) {
    const expected = message(error);
    if (expected) return { status: "error", message: "제출 이력이 생겼거나 권한이 변경되어 해제하지 못했습니다. 화면을 새로고침한 뒤 다시 확인해 주세요." };
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
