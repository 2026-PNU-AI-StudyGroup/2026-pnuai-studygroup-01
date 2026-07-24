"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { AcademicCycleAlreadyExistsError } from "@/modules/academic-cycle/application/academic-cycle-errors";
import {
  AcademicCycleCreationForbiddenError,
  CreateAcademicCycleService,
} from "@/modules/academic-cycle/application/create-academic-cycle";
import { PrismaAcademicCycleRepository } from "@/modules/academic-cycle/infrastructure/prisma-academic-cycle-repository";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type AcademicCycleActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

const academicCycleSchema = z.object({
  academicYear: z.coerce.number().int().min(2000).max(9999),
  term: z.enum(["FIRST", "SECOND"]),
});

export async function createAcademicCycleAction(
  _previousState: AcademicCycleActionState,
  formData: FormData,
): Promise<AcademicCycleActionState> {
  const actor = await getCurrentActor();
  if (!actor) {
    redirect("/sign-in");
  }

  const parsed = academicCycleSchema.safeParse({
    academicYear: formData.get("academicYear"),
    term: formData.get("term"),
  });
  if (!parsed.success) {
    return { status: "error", message: "학년도와 학기를 확인해 주세요." };
  }

  const repository = new PrismaAcademicCycleRepository(prisma);
  const service = new CreateAcademicCycleService(repository);

  try {
    await service.execute({ actorRole: actor.role, ...parsed.data });
  } catch (error) {
    if (
      error instanceof AcademicCycleAlreadyExistsError ||
      error instanceof AcademicCycleCreationForbiddenError
    ) {
      return { status: "error", message: error.message };
    }
    throw error;
  }

  revalidatePath("/admin/academic-cycles");
  return { status: "success", message: "학기가 등록되었습니다." };
}
