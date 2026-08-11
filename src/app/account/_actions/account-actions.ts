"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { StudentProfileForbiddenError, StudentProfileService } from "@/modules/identity/application/manage-student-profile";
import { InvalidStudentProfileError } from "@/modules/identity/domain/student-profile";
import { getCurrentOperationalActor } from "@/modules/identity/infrastructure/operational-actor";
import { PrismaStudentProfileRepository } from "@/modules/identity/infrastructure/prisma-student-profile-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type StudentProfileActionState = { status: "idle" | "error" | "success"; message: string };

const schema = z.object({
  phone: z.string().max(40),
  kakao: z.string().max(200),
  github: z.string().max(200),
  instagram: z.string().max(200),
});

export async function saveStudentProfileAction(_state: StudentProfileActionState, formData: FormData): Promise<StudentProfileActionState> {
  const actor = await getCurrentOperationalActor();
  if (!actor) redirect("/sign-in");
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "입력 길이와 형식을 확인해 주세요." };
  try {
    await new StudentProfileService(new PrismaStudentProfileRepository(prisma)).save(actor, parsed.data);
  } catch (error) {
    if (error instanceof InvalidStudentProfileError || error instanceof StudentProfileForbiddenError) return { status: "error", message: error.message };
    throw error;
  }
  revalidatePath("/account");
  revalidatePath("/teams");
  return { status: "success", message: "연락처를 저장했습니다." };
}
