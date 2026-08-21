"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  AnnouncementError,
  AnnouncementService,
} from "@/modules/announcement/application/manage-announcements";
import { PrismaAnnouncementRepository } from "@/modules/announcement/infrastructure/prisma-announcement-repository";
import { announcementReturnHref } from "@/app/_lib/announcement-return-href";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { prisma } from "@/shared/infrastructure/database/prisma";

// 공지 삭제는 전체 공지 화면과 프로그램 공지 목록 양쪽에서 쓴다.
// 라우트 전용 폴더에 두면 한쪽에서만 쓸 수 있어 _actions 로 옮겼다.
export type AnnouncementActionState = { status: "idle" | "error"; message: string };

const idSchema = z.string().uuid();

function service() {
  return new AnnouncementService(new PrismaAnnouncementRepository(prisma));
}

async function actor() {
  const current = await getCurrentActor();
  if (!current) redirect("/sign-in");
  return current;
}

export async function deleteAnnouncementAction(
  announcementId: string,
  _previous: AnnouncementActionState,
  _formData: FormData,
): Promise<AnnouncementActionState> {
  void _previous;
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
  revalidatePath("/projects", "layout");
  redirect(announcementReturnHref(_formData.get("returnTo")));
}
