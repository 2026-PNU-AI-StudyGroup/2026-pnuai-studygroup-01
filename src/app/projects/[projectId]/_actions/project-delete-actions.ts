"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import {
  DeleteProjectError,
  DeleteProjectService,
} from "@/modules/topic/application/delete-project";
import { PrismaProjectDeletionRepository } from "@/modules/topic/infrastructure/prisma-project-deletion-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type ProjectDeleteActionState = { status: "idle" | "error"; message: string };

export async function deleteProjectAction(
  _previousState: ProjectDeleteActionState,
  formData: FormData,
): Promise<ProjectDeleteActionState> {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const parsed = z.object({
    topicId: z.string().uuid(),
    reason: z.string(),
    confirmedTitle: z.string(),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "삭제 내용을 다시 확인해 주세요." };
  try {
    await new DeleteProjectService(
      new PrismaProjectDeletionRepository(prisma),
    ).execute(actor, {
      projectId: parsed.data.topicId,
      reason: parsed.data.reason,
      confirmedTitle: parsed.data.confirmedTitle,
    });
  } catch (error) {
    if (error instanceof DeleteProjectError) {
      return { status: "error", message: error.message };
    }
    throw error;
  }
  revalidatePath("/professor/topics");
  revalidatePath("/topics");
  redirect("/topics");
}

