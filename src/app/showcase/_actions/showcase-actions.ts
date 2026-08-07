"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  normalizeShowcaseUrl,
  SHOWCASE_LIMITS,
  type ShowcaseActionState,
} from "@/app/showcase/_lib/showcase-options";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { prisma } from "@/shared/infrastructure/database/prisma";

const idSchema = z.string().uuid();

async function requireActor() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  return actor;
}

// 편집 권한: 팀원(학생) ∪ 담당 교수 ∪ 관리자
async function canEdit(teamId: string, actor: { id: string; role: string }): Promise<boolean> {
  const team = await prisma.team.findUnique({ where: { id: teamId }, select: { professorId: true } });
  if (!team) return false;
  if (actor.role === "ADMIN" || team.professorId === actor.id) return true;
  const membership = await prisma.teamMember.findFirst({
    where: { teamId, studentId: actor.id },
    select: { id: true },
  });
  return Boolean(membership);
}

function revalidateShowcase(teamId: string) {
  revalidatePath("/showcase");
  revalidatePath(`/showcase/${teamId}`);
  revalidatePath(`/showcase/${teamId}/edit`);
}

export async function saveShowcaseAction(
  teamId: string,
  _previous: ShowcaseActionState,
  formData: FormData,
): Promise<ShowcaseActionState> {
  const actor = await requireActor();
  if (!idSchema.safeParse(teamId).success || !(await canEdit(teamId, actor))) {
    return { status: "error", message: "쇼케이스를 편집할 권한이 없습니다." };
  }
  const summary = String(formData.get("summary") ?? "").trim();
  if (!summary || summary.length > SHOWCASE_LIMITS.summary) {
    return { status: "error", message: "소개는 1자 이상 2,000자 이내로 입력해 주세요." };
  }
  const githubUrl = normalizeShowcaseUrl(formData.get("githubUrl"));
  const youtubeUrl = normalizeShowcaseUrl(formData.get("youtubeUrl"));
  const demoUrl = normalizeShowcaseUrl(formData.get("demoUrl"));
  if (githubUrl === undefined || youtubeUrl === undefined || demoUrl === undefined) {
    return { status: "error", message: "링크는 http 또는 https 주소로 입력해 주세요." };
  }

  await prisma.projectShowcase.upsert({
    where: { teamId },
    create: { teamId, summary, githubUrl, youtubeUrl, demoUrl },
    update: { summary, githubUrl, youtubeUrl, demoUrl },
  });
  revalidateShowcase(teamId);
  return { status: "success", message: "쇼케이스를 저장했습니다." };
}

export async function addShowcaseImageAction(
  teamId: string,
  _previous: ShowcaseActionState,
  formData: FormData,
): Promise<ShowcaseActionState> {
  const actor = await requireActor();
  if (!idSchema.safeParse(teamId).success || !(await canEdit(teamId, actor))) {
    return { status: "error", message: "쇼케이스를 편집할 권한이 없습니다." };
  }
  const uploadId = String(formData.get("uploadId") ?? "");
  if (!idSchema.safeParse(uploadId).success) {
    return { status: "error", message: "이미지 업로드에 실패했습니다. 다시 시도해 주세요." };
  }
  const file = await prisma.storedFile.findUnique({
    where: { id: uploadId },
    select: { teamId: true, status: true, contentType: true },
  });
  if (!file || file.teamId !== teamId || !file.contentType.startsWith("image/") ||
      (file.status !== "READY" && file.status !== "ATTACHED")) {
    return { status: "error", message: "이미지 파일만 첨부할 수 있습니다." };
  }
  const showcase = await prisma.projectShowcase.findUnique({ where: { teamId }, select: { id: true } });
  if (!showcase) {
    return { status: "error", message: "먼저 소개를 저장한 뒤 이미지를 추가해 주세요." };
  }
  const count = await prisma.showcaseImage.count({ where: { showcaseId: showcase.id } });
  if (count >= SHOWCASE_LIMITS.maxImages) {
    return { status: "error", message: "이미지는 최대 12장까지 추가할 수 있습니다." };
  }

  await prisma.$transaction([
    prisma.showcaseImage.create({
      data: { showcaseId: showcase.id, fileId: uploadId, position: count, isCover: count === 0 },
    }),
    prisma.storedFile.update({ where: { id: uploadId }, data: { status: "ATTACHED" } }),
  ]);
  revalidateShowcase(teamId);
  return { status: "success", message: "이미지를 추가했습니다." };
}

export async function removeShowcaseImageAction(
  imageId: string,
  _previous: ShowcaseActionState,
  _formData: FormData,
): Promise<ShowcaseActionState> {
  void _formData;
  const actor = await requireActor();
  const image = await prisma.showcaseImage.findUnique({
    where: { id: imageId },
    select: { isCover: true, showcaseId: true, showcase: { select: { teamId: true } } },
  });
  if (!image || !(await canEdit(image.showcase.teamId, actor))) {
    return { status: "error", message: "이미지를 삭제할 권한이 없습니다." };
  }
  await prisma.showcaseImage.delete({ where: { id: imageId } });
  // ponytail: 표지 삭제 시 남은 첫 이미지를 표지로 승격. StoredFile은 그대로 둔다(정리 워커 대상 아님, 고아 허용).
  if (image.isCover) {
    const next = await prisma.showcaseImage.findFirst({
      where: { showcaseId: image.showcaseId },
      orderBy: { position: "asc" },
      select: { id: true },
    });
    if (next) await prisma.showcaseImage.update({ where: { id: next.id }, data: { isCover: true } });
  }
  revalidateShowcase(image.showcase.teamId);
  return { status: "success", message: "이미지를 삭제했습니다." };
}

export async function setShowcaseCoverAction(
  imageId: string,
  _previous: ShowcaseActionState,
  _formData: FormData,
): Promise<ShowcaseActionState> {
  void _formData;
  const actor = await requireActor();
  const image = await prisma.showcaseImage.findUnique({
    where: { id: imageId },
    select: { showcaseId: true, showcase: { select: { teamId: true } } },
  });
  if (!image || !(await canEdit(image.showcase.teamId, actor))) {
    return { status: "error", message: "표지를 변경할 권한이 없습니다." };
  }
  await prisma.$transaction([
    prisma.showcaseImage.updateMany({ where: { showcaseId: image.showcaseId }, data: { isCover: false } }),
    prisma.showcaseImage.update({ where: { id: imageId }, data: { isCover: true } }),
  ]);
  revalidateShowcase(image.showcase.teamId);
  return { status: "success", message: "표지 이미지를 변경했습니다." };
}

export async function publishShowcaseAction(
  teamId: string,
  publish: boolean,
  _previous: ShowcaseActionState,
  _formData: FormData,
): Promise<ShowcaseActionState> {
  void _formData;
  const actor = await requireActor();
  if (!idSchema.safeParse(teamId).success || !(await canEdit(teamId, actor))) {
    return { status: "error", message: "쇼케이스를 편집할 권한이 없습니다." };
  }
  const showcase = await prisma.projectShowcase.findUnique({
    where: { teamId },
    select: { id: true, publishedAt: true },
  });
  if (!showcase) {
    return { status: "error", message: "먼저 소개를 저장해 주세요." };
  }
  await prisma.projectShowcase.update({
    where: { teamId },
    data: {
      isPublished: publish,
      publishedAt: publish ? (showcase.publishedAt ?? new Date()) : null,
    },
  });
  revalidateShowcase(teamId);
  return {
    status: "success",
    message: publish ? "쇼케이스를 공개했습니다." : "공개를 해제했습니다.",
  };
}
