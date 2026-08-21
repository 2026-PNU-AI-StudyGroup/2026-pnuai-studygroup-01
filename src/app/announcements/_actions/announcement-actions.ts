"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { resolveAnnouncementAudience } from "@/app/announcements/_lib/announcement-audience";
import { announcementReturnHref } from "@/app/_lib/announcement-return-href";
import {
  AnnouncementError,
  AnnouncementService,
} from "@/modules/announcement/application/manage-announcements";
import { PrismaAnnouncementRepository } from "@/modules/announcement/infrastructure/prisma-announcement-repository";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type AnnouncementActionState = {
  status: "idle" | "error";
  message: string;
};

const announcementSchema = z.object({
  title: z.string().trim().min(1).max(120),
  content: z.string().trim().min(1).max(20_000),
  visibility: z.enum(["AUTHENTICATED", "TARGET_MEMBERS"]).default("AUTHENTICATED"),
  pinned: z.boolean(),
});
const idSchema = z.string().uuid();

function service() {
  return new AnnouncementService(new PrismaAnnouncementRepository(prisma));
}

async function actor() {
  const current = await getCurrentActor();
  if (!current) redirect("/sign-in");
  return current;
}

function parseAnnouncement(formData: FormData) {
  return announcementSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
    visibility: formData.get("visibility") ?? undefined,
    pinned: formData.get("pinned") === "on" || formData.get("pinned") === "true",
  });
}

function parseAttachmentIds(formData: FormData) {
  const retainedAttachmentIds = formData.getAll("retainedAttachmentIds");
  const newAttachmentUploadIds = formData.getAll("newAttachmentUploadIds");
  const all = [...retainedAttachmentIds, ...newAttachmentUploadIds];
  if (all.some((value) => typeof value !== "string" || !idSchema.safeParse(value).success)) return null;
  return {
    retainedAttachmentIds: retainedAttachmentIds as string[],
    newAttachmentUploadIds: newAttachmentUploadIds as string[],
  };
}

// 폼의 고정 대상("team:<id>" 또는 "program:<id>")을 scope로 변환한다.
// 실제 소관 여부는 애플리케이션 서비스에서 audience와 대조한다.
function parseTarget(
  raw: FormDataEntryValue | null,
): { teamId: string | null; programId: string | null } | null {
  if (raw !== null && typeof raw !== "string") return null;
  const value = raw ?? "";
  if (value === "" || value === "GLOBAL") return { teamId: null, programId: null };
  const separator = value.indexOf(":");
  const kind = value.slice(0, separator);
  const id = value.slice(separator + 1);
  if (!idSchema.safeParse(id).success) return null;
  if (kind === "program") return { teamId: null, programId: id };
  if (kind === "team" || kind === "project_team") return { teamId: id, programId: null };
  return null;
}

export async function createAnnouncementAction(
  _previous: AnnouncementActionState,
  formData: FormData,
): Promise<AnnouncementActionState> {
  const parsed = parseAnnouncement(formData);
  if (!parsed.success) {
    return {
      status: "error",
      message: "제목은 120자 이내, 본문은 20,000자 이내로 입력해 주세요.",
    };
  }

  const current = await actor();
  const target = parseTarget(formData.get("target"));
  const attachments = parseAttachmentIds(formData);
  // 전체·프로그램·팀 세 가지 대상을 모두 받는다. 권한과 대상 소관 확인은 서비스가 한다.
  if (!target || !attachments) {
    return { status: "error", message: "공지 대상을 확인해 주세요." };
  }
  const audience = await resolveAnnouncementAudience(current);

  let announcementId: string;
  let createdTeamId: string | null = null;
  try {
    const created = await service().create(current, audience, { ...parsed.data, ...target, ...attachments });
    announcementId = created.id;
    createdTeamId = created.teamId;
  } catch (error) {
    if (error instanceof AnnouncementError) {
      return { status: "error", message: error.message };
    }
    throw error;
  }

  revalidatePath("/announcements");
  if (createdTeamId || target.programId) revalidatePath("/projects", "layout");
  redirect(`/announcements/${announcementId}`);
}

export async function updateAnnouncementAction(
  announcementId: string,
  _previous: AnnouncementActionState,
  formData: FormData,
): Promise<AnnouncementActionState> {
  const parsedId = idSchema.safeParse(announcementId);
  const parsed = parseAnnouncement(formData);
  if (!parsedId.success || !parsed.success) {
    return {
      status: "error",
      message: "공지사항 입력값을 확인해 주세요.",
    };
  }

  const current = await actor();
  const target = parseTarget(formData.get("target"));
  const attachments = parseAttachmentIds(formData);
  if (!target || !attachments) {
    return { status: "error", message: "공지 대상을 확인해 주세요." };
  }
  const audience = await resolveAnnouncementAudience(current);

  try {
    await service().update(current, audience, parsedId.data, { ...parsed.data, ...target, ...attachments });
  } catch (error) {
    if (error instanceof AnnouncementError) {
      return { status: "error", message: error.message };
    }
    throw error;
  }

  revalidatePath("/announcements");
  revalidatePath(`/announcements/${parsedId.data}`);
  revalidatePath("/topics");
  revalidatePath("/projects", "layout");
  redirect(announcementReturnHref(formData.get("returnTo"), `/announcements/${parsedId.data}`));
}

