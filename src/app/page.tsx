import { redirect } from "next/navigation";

import { SignInLanding } from "@/app/_components/sign-in-landing";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { isDevelopmentMockAuthEnabled } from "@/modules/identity/infrastructure/development-mock-auth";
import { prisma } from "@/shared/infrastructure/database/prisma";

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ mockLogin?: string }>;
}) {
  const actor = await getCurrentActor();
  if (actor) {
    const registration = await prisma.user.findUnique({
      where: { id: actor.id },
      select: {
        privacyConsentAt: true,
        onboardingRequired: true,
        onboardingCompletedAt: true,
      },
    });
    // 처리방침 확인은 역할과 무관하게 1회 필요하다.
    if (!registration?.privacyConsentAt) redirect("/onboarding");
    if (
      actor.role === "STUDENT" &&
      registration.onboardingRequired &&
      !registration.onboardingCompletedAt
    ) {
      redirect("/onboarding");
    }
    // 자문위원은 배정된 프로젝트만 다루므로 담당 프로젝트 화면이 첫 화면이다.
    if (actor.role === "ADVISOR") redirect("/advisor");
    redirect("/topics");
  }

  const params = await searchParams;
  const showDevelopmentLogin = isDevelopmentMockAuthEnabled({
    nodeEnv: process.env.NODE_ENV,
    explicitlyEnabled: process.env.ENABLE_DEVELOPMENT_MOCK_AUTH,
  });

  return (
    <SignInLanding
      showDevelopmentLogin={showDevelopmentLogin}
      seedRequired={params?.mockLogin === "seed-required"}
    />
  );
}
