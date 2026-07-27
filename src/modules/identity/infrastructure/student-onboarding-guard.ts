import { redirect } from "next/navigation";

import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import { prisma } from "@/shared/infrastructure/database/prisma";

export async function requireCompletedStudentOnboarding<TActor extends CurrentActor>(
  actor: TActor,
): Promise<TActor> {
  if (actor.role !== "STUDENT") return actor;

  const registration = await prisma.user.findUnique({
    where: { id: actor.id },
    select: {
      onboardingRequired: true,
      onboardingCompletedAt: true,
    },
  });
  if (registration?.onboardingRequired && !registration.onboardingCompletedAt) {
    redirect("/onboarding");
  }
  return actor;
}
