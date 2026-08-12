"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { resolveAnnouncementAudience } from "@/app/announcements/_lib/announcement-audience";
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
  category: z.enum(["GENERAL", "HACKATHON", "GRADUATION_PROJECT"]).catch("GENERAL"),
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
    category: formData.get("category") ?? undefined,
    visibility: formData.get("visibility") ?? undefined,
    pinned: formData.get("pinned") === "on" || formData.get("pinned") === "true",
  });
}

// 폼의 대상 선택("", "program:<id>", "team:<id>")을 scope로 변환한다.
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
  if (kind === "team") return { teamId: id, programId: null };
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
  if (!target) {
    return { status: "error", message: "공지 대상을 확인해 주세요." };
  }
  const audience = await resolveAnnouncementAudience(current);

  let announcementId: string;
  let createdTeamId: string | null = null;
  try {
    const created = await service().create(current, audience, { ...parsed.data, ...target });
    announcementId = created.id;
    createdTeamId = created.teamId;
  } catch (error) {
    if (error instanceof AnnouncementError) {
      return { status: "error", message: error.message };
    }
    throw error;
  }

  revalidatePath("/announcements");
  revalidatePath("/topics");
  if (createdTeamId) revalidatePath(`/teams/${createdTeamId}`, "layout");
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
  if (!target) {
    return { status: "error", message: "공지 대상을 확인해 주세요." };
  }
  const audience = await resolveAnnouncementAudience(current);

  try {
    await service().update(current, audience, parsedId.data, { ...parsed.data, ...target });
  } catch (error) {
    if (error instanceof AnnouncementError) {
      return { status: "error", message: error.message };
    }
    throw error;
  }

  revalidatePath("/announcements");
  revalidatePath(`/announcements/${parsedId.data}`);
  revalidatePath("/topics");
  revalidatePath("/teams/[teamId]", "layout");
  redirect(`/announcements/${parsedId.data}`);
}

export async function deleteAnnouncementAction(
  announcementId: string,
  _previous: AnnouncementActionState,
  _formData: FormData,
): Promise<AnnouncementActionState> {
  void _previous;
  void _formData;
  const parsedId = idSchema.safeParse(announcementId);
  if (!parsedId.success) {
    return { status: "error", message: "공지사항 정보를 확인해 주세요." };
  }

  try {
    await service().delete(await actor(), parsedId.data);
  } catch (error) {
    if (error instanceof AnnouncementError) {
      return { status: "error", message: error.message };
    }
    throw error;
  }

  revalidatePath("/announcements");
  revalidatePath("/topics");
  revalidatePath("/teams/[teamId]", "layout");
  redirect("/announcements");
}
