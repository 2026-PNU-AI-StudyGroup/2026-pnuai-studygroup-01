"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

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
  });
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

  let announcementId: string;
  try {
    const created = await service().create(await actor(), parsed.data);
    announcementId = created.id;
  } catch (error) {
    if (error instanceof AnnouncementError) {
      return { status: "error", message: error.message };
    }
    throw error;
  }

  revalidatePath("/announcements");
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

  try {
    await service().update(await actor(), parsedId.data, parsed.data);
  } catch (error) {
    if (error instanceof AnnouncementError) {
      return { status: "error", message: error.message };
    }
    throw error;
  }

  revalidatePath("/announcements");
  revalidatePath(`/announcements/${parsedId.data}`);
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
  redirect("/announcements");
}
