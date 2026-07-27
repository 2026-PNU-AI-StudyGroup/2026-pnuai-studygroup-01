"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import {
  StudentNumberAlreadyUsedError,
  StudentOnboardingForbiddenError,
  StudentOnboardingService,
} from "@/modules/identity/application/complete-student-onboarding";
import { InvalidStudentOnboardingProfileError } from "@/modules/identity/domain/student-onboarding";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { PrismaStudentOnboardingRepository } from "@/modules/identity/infrastructure/prisma-student-onboarding-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";

export type CompleteOnboardingActionState = {
  status: "idle" | "error";
  message: string;
};

const onboardingSchema = z.object({
  name: z.string().max(50),
  department: z.string().max(100),
  studentNumber: z.string().max(20),
  grade: z.coerce.number().int(),
  phoneNumber: z.string().max(30),
  contactEmail: z.string().max(254),
});

export async function completeOnboardingAction(
  _state: CompleteOnboardingActionState,
  formData: FormData,
): Promise<CompleteOnboardingActionState> {
  const actor = await getCurrentActor();
  if (!actor) redirect("/");

  const parsed = onboardingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: "필수 가입 정보를 모두 확인해 주세요." };
  }

  try {
    await new StudentOnboardingService(
      new PrismaStudentOnboardingRepository(prisma),
    ).complete(actor, parsed.data);
  } catch (error) {
    if (
      error instanceof InvalidStudentOnboardingProfileError ||
      error instanceof StudentNumberAlreadyUsedError ||
      error instanceof StudentOnboardingForbiddenError
    ) {
      return { status: "error", message: error.message };
    }
    throw error;
  }

  redirect("/topics");
}
