import { redirect } from "next/navigation";

import { SignInLanding } from "@/app/_components/sign-in-landing";
import { findAdvisorLandingPath } from "@/modules/advisor/infrastructure/prisma-advisor-landing-query";
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
    // 자문위원은 담당 프로젝트 배정과 프로그램 초대 중 무엇을 받았는지에 따라 첫 화면이
    // 갈린다. 초대만 받은 위원에게 담당 목록은 언제나 비어 있다.
    if (actor.role === "ADVISOR") redirect(await findAdvisorLandingPath(prisma, actor.id));
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
