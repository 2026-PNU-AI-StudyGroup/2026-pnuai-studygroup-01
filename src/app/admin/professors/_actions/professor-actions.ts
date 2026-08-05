"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  InvalidProfessorEmailError,
  ProfessorAccessForbiddenError,
  ProfessorAccessNotFoundError,
  ProfessorHasActiveProjectsError,
  ProfessorAccessService,
} from "@/modules/identity/application/manage-professor-access";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { PrismaProfessorAccessRepository } from "@/modules/identity/infrastructure/prisma-professor-access-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type ProfessorAccessActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

const emailSchema = z.string().trim().email().max(320);

async function actorAndService() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  return {
    actor,
    service: new ProfessorAccessService(new PrismaProfessorAccessRepository(prisma)),
  };
}

export async function grantProfessorAccessAction(
  _previousState: ProfessorAccessActionState,
  formData: FormData,
): Promise<ProfessorAccessActionState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { status: "error", message: "이메일 형식을 확인해 주세요." };
  const { actor, service } = await actorAndService();
  try {
    await service.grant(actor, parsed.data);
  } catch (error) {
    if (error instanceof InvalidProfessorEmailError || error instanceof ProfessorAccessForbiddenError) {
      return { status: "error", message: error.message };
    }
    throw error;
  }
  revalidatePath("/admin/professors");
  return { status: "success", message: "교수 권한을 허용했습니다." };
}

export async function revokeProfessorAccessAction(
  _previousState: ProfessorAccessActionState,
  formData: FormData,
): Promise<ProfessorAccessActionState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { status: "error", message: "이메일 형식을 확인해 주세요." };
  const { actor, service } = await actorAndService();
  try {
    await service.revoke(actor, parsed.data);
  } catch (error) {
    if (
      error instanceof InvalidProfessorEmailError ||
      error instanceof ProfessorAccessForbiddenError ||
      error instanceof ProfessorAccessNotFoundError ||
      error instanceof ProfessorHasActiveProjectsError
    ) return { status: "error", message: error.message };
    throw error;
  }
  revalidatePath("/admin/professors");
  return { status: "success", message: "교수 권한을 회수했습니다." };
}
