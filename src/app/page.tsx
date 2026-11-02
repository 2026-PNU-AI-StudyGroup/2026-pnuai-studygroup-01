import { redirect } from "next/navigation";

import { SignInLanding } from "@/app/_components/sign-in-landing";
import { digestPublicArchive, type PublicArchiveDigest } from "@/app/_components/landing-archive";
import { findAdvisorLandingPath } from "@/modules/advisor/infrastructure/prisma-advisor-landing-query";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { isDevelopmentMockAuthEnabled } from "@/modules/identity/infrastructure/development-mock-auth";
import { listProgramCategoryOrder } from "@/modules/project-program/infrastructure/prisma-program-category-order-repository";
import { PrismaTeamArchiveQueryRepository } from "@/modules/team/infrastructure/prisma-team-archive-query-repository";
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
      archive={await loadArchiveDigest()}
    />
  );
}

/** 첫 화면의 결과물 목록과 숫자. 공개 아카이브와 같은 조회다. 로그인 화면이 이 조회 때문에 막히면 안 되므로 실패하면 빼고 그린다. */
async function loadArchiveDigest(): Promise<PublicArchiveDigest | null> {
  try {
    const [projects, categoryOrder] = await Promise.all([
      new PrismaTeamArchiveQueryRepository(prisma).listPublic(),
      listProgramCategoryOrder(prisma),
    ]);
    return projects.length > 0 ? digestPublicArchive(projects, categoryOrder) : null;
  } catch {
    return null;
  }
}
