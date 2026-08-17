import { redirect } from "next/navigation";

import type { CurrentActor } from "@/modules/identity/domain/current-actor";
import { prisma } from "@/shared/infrastructure/database/prisma";

// 처리방침 고지 확인은 역할과 무관하게 전원에게 1회 필요하고, 학생은 그 뒤 가입 정보까지 채워야 한다.
export async function requireCompletedStudentOnboarding<TActor extends CurrentActor>(
  actor: TActor,
): Promise<TActor> {
  const registration = await prisma.user.findUnique({
    where: { id: actor.id },
    select: {
      privacyNoticeAckAt: true,
      onboardingRequired: true,
      onboardingCompletedAt: true,
    },
  });
  if (!registration) return actor;
  if (!registration.privacyNoticeAckAt) redirect("/onboarding");
  if (
    actor.role === "STUDENT" &&
    registration.onboardingRequired &&
    !registration.onboardingCompletedAt
  ) {
    redirect("/onboarding");
  }
  return actor;
}
