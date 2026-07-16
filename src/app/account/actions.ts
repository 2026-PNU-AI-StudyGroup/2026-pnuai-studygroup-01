"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { StudentProfileForbiddenError, StudentProfileService } from "@/modules/identity/application/manage-student-profile";
import { InvalidStudentProfileError } from "@/modules/identity/domain/student-profile";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { PrismaStudentProfileRepository } from "@/modules/identity/infrastructure/prisma-student-profile-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type StudentProfileActionState = { status: "idle" | "error" | "success"; message: string };

const schema = z.object({
  interests: z.string().max(1_000).transform(tags),
  skills: z.string().max(1_000).transform(tags),
  desiredRole: z.string().max(200),
  availability: z.string().max(500),
  bio: z.string().max(1_000),
});

function tags(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export async function saveStudentProfileAction(_state: StudentProfileActionState, formData: FormData): Promise<StudentProfileActionState> {
  const actor = await getCurrentActor();
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
  revalidatePath("/topics");
  revalidatePath("/recruitments");
  return { status: "success", message: "프로젝트 프로필을 저장했습니다." };
}
