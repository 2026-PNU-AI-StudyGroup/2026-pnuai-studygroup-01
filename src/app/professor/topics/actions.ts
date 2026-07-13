"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PrismaAcademicCycleRepository } from "@/modules/academic-cycle/infrastructure/prisma-academic-cycle-repository";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { CreateTopicService } from "@/modules/topic/application/create-topic";
import { PrismaTopicRepository } from "@/modules/topic/infrastructure/prisma-topic-repository";
import { getCreateTopicErrorMessage } from "@/modules/topic/ui/create-topic-error";
import { createTopicInputSchema } from "@/modules/topic/ui/create-topic-input";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type CreateTopicActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

export async function createTopicAction(
  _previousState: CreateTopicActionState,
  formData: FormData,
): Promise<CreateTopicActionState> {
  const actor = await getCurrentActor();
  if (!actor) {
    redirect("/sign-in");
  }

  const parsed = createTopicInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "주제 내용과 기간을 확인해 주세요." };
  }

  const cycleRepository = new PrismaAcademicCycleRepository(prisma);
  const topicRepository = new PrismaTopicRepository(prisma);
  const service = new CreateTopicService(topicRepository, cycleRepository);

  try {
    await service.execute(actor, parsed.data);
  } catch (error) {
    const message = getCreateTopicErrorMessage(error);
    if (message) {
      return { status: "error", message };
    }
    throw error;
  }

  revalidatePath("/professor/topics");
  return { status: "success", message: "주제 초안이 저장되었습니다." };
}
