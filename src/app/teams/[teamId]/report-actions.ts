"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import {
  InvalidReportInputError,
  ReportOperationNotAllowedError,
  ReportService,
} from "@/modules/report/application/manage-reports";
import { PrismaReportRepository } from "@/modules/report/infrastructure/prisma-report-repository";
import {
  artifactRegistrationSchema,
  reportDecisionSchema,
  reportSubmissionSchema,
} from "@/modules/report/ui/report-input";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type ReportActionState = { status: "idle" | "error" | "success"; message: string };

function reportService() {
  return new ReportService(new PrismaReportRepository(prisma));
}

function message(error: unknown) {
  return error instanceof InvalidReportInputError ||
    error instanceof ReportOperationNotAllowedError
    ? error.message
    : null;
}

export async function submitReportVersionAction(formData: FormData): Promise<ReportActionState> {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const parsed = reportSubmissionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "보고서 입력을 확인해 주세요." };
  try {
    const result = await reportService().submit(actor, {
      teamId: parsed.data.teamId,
      type: parsed.data.type,
      fileId: parsed.data.uploadId,
      description: parsed.data.description,
    });
    revalidatePath(`/teams/${parsed.data.teamId}`);
    return { status: "success", message: `${result.version}차 버전을 제출했습니다.` };
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
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const parsed = reportDecisionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "결정 입력을 확인해 주세요." };
  try {
    await reportService().decide(actor, parsed.data);
    revalidatePath(`/teams/${parsed.data.teamId}`);
    return { status: "success", message: "검토 결정을 저장했습니다." };
  } catch (error) {
    const expected = message(error);
    if (expected) return { status: "error", message: expected };
    throw error;
  }
}

export async function registerArtifactAction(formData: FormData): Promise<ReportActionState> {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const values = Object.fromEntries(formData);
  if (values.uploadId === "") delete values.uploadId;
  if (values.externalUrl === "") delete values.externalUrl;
  const parsed = artifactRegistrationSchema.safeParse(values);
  if (!parsed.success) return { status: "error", message: "결과물 입력을 확인해 주세요." };
  try {
    await reportService().registerArtifact(actor, {
      teamId: parsed.data.teamId,
      type: parsed.data.type,
      title: parsed.data.title,
      fileId: parsed.data.uploadId,
      externalUrl: parsed.data.externalUrl,
    });
    revalidatePath(`/teams/${parsed.data.teamId}`);
    return { status: "success", message: "결과물을 등록했습니다." };
  } catch (error) {
    const expected = message(error);
    if (expected) return { status: "error", message: expected };
    throw error;
  }
}
