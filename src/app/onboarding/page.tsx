import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "@/app/_components/app-shell";
import { StudentOnboardingForm } from "@/app/onboarding/_components/student-onboarding-form";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { ExplorerHero } from "@/shared/ui/explorer-hero";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("가입 정보 입력");
}

export default async function OnboardingPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/");
  if (actor.role !== "STUDENT") redirect("/topics");

  const user = await prisma.user.findUnique({
    where: { id: actor.id },
    select: {
      name: true,
      onboardingRequired: true,
      onboardingCompletedAt: true,
    },
  });
  if (!user?.onboardingRequired || user.onboardingCompletedAt) {
    redirect("/topics");
  }

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/onboarding">
      <main className="content-shell page-enter pb-24 lg:pb-12">
        <div className="mx-auto max-w-4xl">
          <ExplorerHero
            title={<UiText>{"가입 정보 입력"}</UiText>}
            description={<UiText>{"최초 한 번만 입력하며, 팀과 프로젝트 참여에 필요한 연락 정보로 사용됩니다."}</UiText>}
          />
          <section aria-labelledby="student-onboarding-title" className="page-enter pt-7">
            <div className="pb-6">
              <h2 id="student-onboarding-title" className="text-lg font-bold tracking-[-0.025em] text-[var(--ink)]">
                <UiText>{"학생 기본 정보"}</UiText>
              </h2>
            </div>
            <StudentOnboardingForm defaultName={user.name} />
          </section>
        </div>
      </main>
    </AppShell>
  );
}
