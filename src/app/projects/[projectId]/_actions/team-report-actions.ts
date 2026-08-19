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
  ShowcaseVideoService,
} from "@/modules/report/application/manage-reports";
import { PrismaArtifactRepository } from "@/modules/report/infrastructure/prisma-artifact-repository";
import { PrismaReportDecisionRepository } from "@/modules/report/infrastructure/prisma-report-decision-repository";
import { PrismaReportFeedbackRepository } from "@/modules/report/infrastructure/prisma-report-feedback-repository";
import { PrismaReportSubmissionRepository } from "@/modules/report/infrastructure/prisma-report-submission-repository";
import {
  artifactRegistrationSchema,
  artifactRemovalSchema,
  artifactReorderSchema,
  artifactUpdateSchema,
  reportDecisionSchema,
  reportFeedbackSchema,
  reportSubmissionSchema,
  showcaseBasicsSchema,
  showcaseImageSchema,
  showcaseIntroSchema,
  showcaseVideoSchema,
  teamThumbnailSchema,
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
    revalidatePath("/projects", "layout");
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
    revalidatePath("/projects", "layout");
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
    revalidatePath("/projects", "layout");
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
    revalidatePath("/projects", "layout");
    return { status: "success", message: "결과물을 등록했습니다." };
  } catch (error) {
    const expected = message(error);
    if (expected) return { status: "error", message: expected };
    throw error;
  }
}

export async function registerShowcaseImageAction(formData: FormData): Promise<ReportActionState> {
  const actor = await getCurrentOperationalActor();
  if (!actor) redirect("/sign-in");
  const parsed = showcaseImageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "이미지 정보를 확인해 주세요." };
  try {
    await new ArtifactRegistrationService(
      new PrismaArtifactRepository(prisma),
    ).registerArtifact(actor, {
      teamId: parsed.data.teamId,
      type: parsed.data.type,
      title: parsed.data.title,
      fileId: parsed.data.uploadId,
    });
    revalidatePath("/projects", "layout");
    return { status: "success", message: "이미지를 등록했습니다." };
  } catch (error) {
    const expected = message(error);
    if (expected) return { status: "error", message: expected };
    throw error;
  }
}

export async function upsertShowcaseVideoAction(
  _state: ReportActionState,
  formData: FormData,
): Promise<ReportActionState> {
  const actor = await getCurrentOperationalActor();
  if (!actor) redirect("/sign-in");
  const parsed = showcaseVideoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "YouTube 링크를 확인해 주세요." };
  try {
    await new ShowcaseVideoService(new PrismaArtifactRepository(prisma)).save(actor, parsed.data);
    revalidatePath("/projects", "layout");
    return { status: "success", message: "시연·발표 영상을 저장했습니다." };
  } catch (error) {
    const expected = message(error);
    if (expected) return { status: "error", message: "YouTube 링크를 확인해 주세요." };
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
    revalidatePath("/projects", "layout");
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
    revalidatePath("/projects", "layout");
    return { status: "success", message: "결과물을 삭제했습니다." };
  } catch (error) {
    const expected = message(error);
    if (expected) return { status: "error", message: expected };
    throw error;
  }
}

export async function reorderArtifactsAction(formData: FormData): Promise<ReportActionState> {
  const actor = await getCurrentOperationalActor();
  if (!actor) redirect("/sign-in");
  const parsed = artifactReorderSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "이미지 순서를 확인해 주세요." };
  try {
    await new ArtifactManagementService(new PrismaArtifactRepository(prisma)).reorderArtifacts(actor, parsed.data);
    revalidatePath("/projects", "layout");
    return { status: "success", message: "이미지 순서를 변경했습니다." };
  } catch (error) {
    const expected = message(error);
    if (expected) return { status: "error", message: expected };
    throw error;
  }
}

export async function saveShowcaseIntroAction(
  _state: ReportActionState,
  formData: FormData,
): Promise<ReportActionState> {
  const actor = await getCurrentOperationalActor();
  if (!actor) redirect("/sign-in");
  const parsed = showcaseIntroSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "프로젝트 소개는 20,000자까지 저장할 수 있습니다." };
  try {
    await new ArtifactManagementService(new PrismaArtifactRepository(prisma)).setShowcaseIntro(actor, parsed.data);
    revalidatePath("/projects", "layout");
    revalidatePath("/topics", "layout");
    return { status: "success", message: "프로젝트 소개를 저장했습니다." };
  } catch (error) {
    const expected = message(error);
    if (expected) return { status: "error", message: expected };
    throw error;
  }
}

// 결과물 화면의 "전체 저장"이 쓴다. 소개 글과 영상 링크를 한 요청으로 저장한다.
// 사진·대표 이미지·자료는 고를 때 바로 올라가므로 여기서 다시 저장할 것이 없다.
export async function saveShowcaseBasicsAction(formData: FormData): Promise<ReportActionState> {
  const actor = await getCurrentOperationalActor();
  if (!actor) redirect("/sign-in");
  const parsed = showcaseBasicsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "결과물 입력을 확인해 주세요." };
  const { teamId, intro, externalUrl } = parsed.data;
  try {
    const repository = new PrismaArtifactRepository(prisma);
    if (intro !== undefined) {
      await new ArtifactManagementService(repository).setShowcaseIntro(actor, { teamId, intro });
    }
    if (externalUrl) {
      await new ShowcaseVideoService(repository).save(actor, { teamId, externalUrl });
    }
    revalidatePath("/projects", "layout");
    revalidatePath("/topics", "layout");
    return { status: "success", message: "결과물을 저장했습니다." };
  } catch (error) {
    const expected = message(error);
    if (expected) return { status: "error", message: expected };
    throw error;
  }
}

export async function setTeamThumbnailAction(formData: FormData): Promise<ReportActionState> {
  const actor = await getCurrentOperationalActor();
  if (!actor) redirect("/sign-in");
  const values = Object.fromEntries(formData);
  if (values.uploadId === "") delete values.uploadId;
  const parsed = teamThumbnailSchema.safeParse(values);
  if (!parsed.success) return { status: "error", message: "대표 이미지를 확인해 주세요." };
  try {
    await new ArtifactManagementService(new PrismaArtifactRepository(prisma)).setThumbnail(actor, {
      teamId: parsed.data.teamId,
      fileId: parsed.data.uploadId ?? null,
    });
    revalidatePath("/projects", "layout");
    return { status: "success", message: parsed.data.uploadId ? "대표 이미지를 저장했습니다." : "대표 이미지를 삭제했습니다." };
  } catch (error) {
    const expected = message(error);
    if (expected) return { status: "error", message: expected };
    throw error;
  }
}
