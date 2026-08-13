"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { AnnouncementError, AnnouncementService } from "@/modules/announcement/application/manage-announcements";
import { resolveAnnouncementAudience } from "@/modules/announcement/infrastructure/announcement-audience";
import { PrismaAnnouncementRepository } from "@/modules/announcement/infrastructure/prisma-announcement-repository";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { prisma } from "@/shared/infrastructure/database/prisma";

import type { ProgramAnnouncementActionState } from "@/modules/announcement/ui/program-announcement-create-modal";

const schema = z.object({
  programId: z.string().uuid(),
  title: z.string().trim().min(1).max(120),
  content: z.string().trim().min(1).max(20_000),
  visibility: z.enum(["AUTHENTICATED", "TARGET_MEMBERS"]),
  pinned: z.boolean(),
});

export async function createProgramAnnouncementAction(
  _previous: ProgramAnnouncementActionState,
  formData: FormData,
): Promise<ProgramAnnouncementActionState> {
  const parsed = schema.safeParse({
    ...Object.fromEntries(formData),
    pinned: formData.get("pinned") === "on" || formData.get("pinned") === "true",
  });
  if (!parsed.success) return { status: "error", message: "공지 제목과 본문을 확인해 주세요." };

  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const audience = await resolveAnnouncementAudience(actor);
  const newAttachmentUploadIds = formData.getAll("newAttachmentUploadIds");
  if (newAttachmentUploadIds.some((value) => typeof value !== "string" || !z.string().uuid().safeParse(value).success)) {
    return { status: "error", message: "첨부파일 정보를 확인해 주세요." };
  }
  try {
    await new AnnouncementService(new PrismaAnnouncementRepository(prisma)).create(actor, audience, {
      title: parsed.data.title,
      content: parsed.data.content,
      visibility: parsed.data.visibility,
      pinned: parsed.data.pinned,
      programId: parsed.data.programId,
      teamId: null,
      retainedAttachmentIds: [],
      newAttachmentUploadIds: newAttachmentUploadIds as string[],
    });
  } catch (error) {
    if (error instanceof AnnouncementError) return { status: "error", message: error.message };
    throw error;
  }

  revalidatePath("/topics");
  return { status: "success", message: "프로그램 공지를 등록했습니다." };
}
