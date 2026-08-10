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
const showcaseImageContentTypes = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;

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
    select: { teamId: true, ownerId: true, purpose: true, consumer: true, status: true, contentType: true },
  });
  if (
    !file ||
    file.teamId !== teamId ||
    file.ownerId !== actor.id ||
    file.purpose !== "ARTIFACT" ||
    file.consumer !== "SHOWCASE_IMAGE" ||
    file.status !== "READY" ||
    !showcaseImageContentTypes.includes(file.contentType as typeof showcaseImageContentTypes[number])
  ) {
    return { status: "error", message: "이미지 파일만 첨부할 수 있습니다." };
  }
  const result = await prisma.$transaction(async (transaction) => {
    const teams = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "team" WHERE "id" = ${teamId} FOR UPDATE
    `;
    const canAttach = teams[0] && (
      actor.role === "ADMIN" ||
      (actor.role === "PROFESSOR" && Boolean(await transaction.team.findFirst({ where: { id: teamId, professorId: actor.id }, select: { id: true } }))) ||
      (actor.role === "STUDENT" && Boolean(await transaction.teamMember.findFirst({ where: { teamId, studentId: actor.id }, select: { id: true } })))
    );
    if (!canAttach) return "FORBIDDEN" as const;
    const showcase = await transaction.projectShowcase.findUnique({ where: { teamId }, select: { id: true } });
    if (!showcase) return "MISSING_SHOWCASE" as const;
    const count = await transaction.showcaseImage.count({ where: { showcaseId: showcase.id } });
    if (count >= SHOWCASE_LIMITS.maxImages) return "LIMIT_REACHED" as const;
    const max = await transaction.showcaseImage.aggregate({ where: { showcaseId: showcase.id }, _max: { position: true } });
    const attached = await transaction.storedFile.updateMany({
      where: {
        id: uploadId,
        teamId,
        ownerId: actor.id,
        purpose: "ARTIFACT",
        consumer: "SHOWCASE_IMAGE",
        contentType: { in: [...showcaseImageContentTypes] },
        status: "READY",
      },
      data: { status: "ATTACHED" },
    });
    if (attached.count !== 1) return "INVALID_FILE" as const;
    await transaction.showcaseImage.create({
      data: { showcaseId: showcase.id, fileId: uploadId, position: (max._max.position ?? -1) + 1, isCover: count === 0 },
    });
    return "ATTACHED" as const;
  });
  if (result !== "ATTACHED") {
    const message = result === "LIMIT_REACHED"
      ? "이미지는 최대 12장까지 추가할 수 있습니다."
      : result === "MISSING_SHOWCASE"
        ? "먼저 소개를 저장한 뒤 이미지를 추가해 주세요."
        : result === "FORBIDDEN"
          ? "쇼케이스를 편집할 권한이 없습니다."
          : "이미지를 다시 확인해 주세요.";
    return { status: "error", message };
  }
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
    select: { fileId: true, isCover: true, showcaseId: true, showcase: { select: { teamId: true } } },
  });
  if (!image || !(await canEdit(image.showcase.teamId, actor))) {
    return { status: "error", message: "이미지를 삭제할 권한이 없습니다." };
  }
  await prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw`SELECT "id" FROM "team" WHERE "id" = ${image.showcase.teamId} FOR UPDATE`;
    await transaction.showcaseImage.delete({ where: { id: imageId } });
    if (image.isCover) {
      const next = await transaction.showcaseImage.findFirst({
        where: { showcaseId: image.showcaseId },
        orderBy: { position: "asc" },
        select: { id: true },
      });
      if (next) await transaction.showcaseImage.update({ where: { id: next.id }, data: { isCover: true } });
    }
    const [artifactReferences, reportReferences, imageReferences] = await Promise.all([
      transaction.artifact.count({ where: { fileId: image.fileId } }),
      transaction.reportVersion.count({ where: { fileId: image.fileId } }),
      transaction.showcaseImage.count({ where: { fileId: image.fileId } }),
    ]);
    if (artifactReferences === 0 && reportReferences === 0 && imageReferences === 0) {
      await transaction.storedFile.deleteMany({ where: { id: image.fileId, consumer: "SHOWCASE_IMAGE" } });
    }
  });
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

async function publishedShowcaseId(teamId: string): Promise<string | null> {
  const showcase = await prisma.projectShowcase.findUnique({
    where: { teamId },
    select: { id: true, isPublished: true },
  });
  return showcase?.isPublished ? showcase.id : null;
}

export async function toggleShowcaseLikeAction(
  teamId: string,
  _previous: ShowcaseActionState,
  _formData: FormData,
): Promise<ShowcaseActionState> {
  void _formData;
  const actor = await getCurrentActor();
  if (!actor) return { status: "error", message: "로그인이 필요합니다." };
  const showcaseId = await publishedShowcaseId(teamId);
  if (!showcaseId) return { status: "error", message: "공개된 프로젝트가 아닙니다." };

  const existing = await prisma.showcaseLike.findUnique({
    where: { showcaseId_userId: { showcaseId, userId: actor.id } },
    select: { id: true },
  });
  if (existing) await prisma.showcaseLike.delete({ where: { id: existing.id } });
  else await prisma.showcaseLike.create({ data: { showcaseId, userId: actor.id } });

  revalidateShowcase(teamId);
  return { status: "success", message: "" };
}

export async function addShowcaseCommentAction(
  teamId: string,
  _previous: ShowcaseActionState,
  formData: FormData,
): Promise<ShowcaseActionState> {
  const actor = await getCurrentActor();
  if (!actor) return { status: "error", message: "로그인이 필요합니다." };
  const showcaseId = await publishedShowcaseId(teamId);
  if (!showcaseId) return { status: "error", message: "공개된 프로젝트가 아닙니다." };
  const body = String(formData.get("body") ?? "").trim();
  if (!body || body.length > 1000) {
    return { status: "error", message: "댓글은 1자 이상 1,000자 이내로 입력해 주세요." };
  }
  await prisma.showcaseComment.create({
    data: { showcaseId, authorId: actor.id, authorName: actor.name, body },
  });
  revalidateShowcase(teamId);
  return { status: "success", message: "댓글을 남겼습니다." };
}

export async function deleteShowcaseCommentAction(
  commentId: string,
  _previous: ShowcaseActionState,
  _formData: FormData,
): Promise<ShowcaseActionState> {
  void _formData;
  const actor = await getCurrentActor();
  if (!actor) return { status: "error", message: "로그인이 필요합니다." };
  const comment = await prisma.showcaseComment.findUnique({
    where: { id: commentId },
    select: { authorId: true, showcase: { select: { teamId: true } } },
  });
  if (!comment) return { status: "error", message: "댓글을 찾을 수 없습니다." };
  if (comment.authorId !== actor.id && actor.role !== "ADMIN") {
    return { status: "error", message: "댓글을 삭제할 권한이 없습니다." };
  }
  await prisma.showcaseComment.delete({ where: { id: commentId } });
  revalidateShowcase(comment.showcase.teamId);
  return { status: "success", message: "댓글을 삭제했습니다." };
}

export async function setShowcaseAwardAction(
  teamId: string,
  _previous: ShowcaseActionState,
  formData: FormData,
): Promise<ShowcaseActionState> {
  const actor = await requireActor();
  if (actor.role !== "ADMIN") {
    return { status: "error", message: "시상은 관리자만 지정할 수 있습니다." };
  }
  const awardName = String(formData.get("awardName") ?? "").trim().slice(0, 40);
  const awardColor = String(formData.get("awardColor") ?? "").trim();
  const validColor = /^#[0-9a-fA-F]{6}$/.test(awardColor) ? awardColor : null;
  await prisma.projectShowcase.update({
    where: { teamId },
    data: { awardName: awardName || null, awardColor: awardName ? validColor : null },
  });
  revalidateShowcase(teamId);
  return { status: "success", message: awardName ? "시상 정보를 저장했습니다." : "시상 정보를 지웠습니다." };
}
