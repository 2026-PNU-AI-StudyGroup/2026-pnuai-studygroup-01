"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { importGithubThumbnail } from "@/modules/github-readme/infrastructure/github-thumbnail-import";
import { getCurrentOperationalActor } from "@/modules/identity/infrastructure/operational-actor";
import { PersonalProjectError, publishPersonalProject } from "@/modules/topic/application/publish-personal-project";
import { PrismaPersonalProjectPublisher } from "@/modules/topic/infrastructure/prisma-personal-project-publisher";
import type { PersonalProjectActionState } from "@/modules/topic/ui/personal-project-form";
import { prisma } from "@/shared/infrastructure/database/prisma";

export async function publishPersonalProjectAction(
  _state: PersonalProjectActionState,
  formData: FormData,
): Promise<PersonalProjectActionState> {
  const actor = await getCurrentOperationalActor();
  if (!actor) redirect("/sign-in");
  const parsed = z.object({
    programId: z.string().uuid(),
    title: z.string().max(400),
    description: z.string().max(20_000),
    divisionId: z.string().uuid().optional(),
    repoUrl: z.string().max(2048).optional(),
  }).safeParse({
    programId: formData.get("programId"),
    title: formData.get("title") ?? "",
    description: formData.get("description") ?? "",
    divisionId: formData.get("divisionId") || undefined,
    repoUrl: formData.get("repoUrl") || undefined,
  });
  if (!parsed.success) return { status: "error", message: "입력 내용을 확인해 주세요." };
  try {
    const result = await publishPersonalProject(actor, parsed.data, new PrismaPersonalProjectPublisher(prisma));
    // 공개는 끝났다. 대표 이미지는 채우지 못해도 결과는 성공이다.
    if (result.repoUrl) {
      await importGithubThumbnail(actor, { teamId: result.teamId, repoUrl: result.repoUrl, replace: false }).catch(() => null);
    }
    revalidatePath("/topics");
    revalidatePath("/dashboard");
    revalidatePath("/projects", "layout");
    return { status: "success", message: "프로젝트를 공개했습니다.", projectId: result.projectId };
  } catch (error) {
    if (error instanceof PersonalProjectError) return { status: "error", message: error.message };
    throw error;
  }
}
