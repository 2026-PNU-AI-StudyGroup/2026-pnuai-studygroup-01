import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "@/app/_components/app-shell";
import { StudentOnboardingForm } from "@/app/onboarding/_components/student-onboarding-form";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiOl } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { ExplorerHero } from "@/shared/ui/explorer-hero";
import { ExplorerLayout } from "@/shared/ui/explorer-layout";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("가입 정보 입력");
}

function OnboardingSidebar() {
  return (
    <div className="px-5 py-6 lg:sticky lg:top-0 lg:h-screen lg:px-5 lg:py-8">
      <div className="border-b border-[var(--line)] pb-6">
        <h2 className="text-sm font-black tracking-[-0.02em] text-[var(--ink)]">
          <UiText>{"가입 정보"}</UiText>
        </h2>
        <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
          <UiText>{"프로젝트 참여에 필요한 기본 정보를 확인합니다."}</UiText>
        </p>
      </div>
      <UiOl className="mt-5 space-y-1" aria-label="가입 단계">
        <li className="relative flex min-h-11 items-center gap-3 border-l-2 border-[var(--primary)] px-3 text-sm font-bold text-[var(--primary)]">
          <span aria-hidden="true" className="grid size-6 place-items-center rounded-full bg-[var(--primary)] text-xs text-white">1</span>
          <UiText>{"기본 정보 입력"}</UiText>
        </li>
        <li className="flex min-h-11 items-center gap-3 border-l-2 border-transparent px-3 text-sm font-bold text-[var(--muted)]">
          <span aria-hidden="true" className="grid size-6 place-items-center rounded-full border border-[var(--line)] text-xs">2</span>
          <UiText>{"프로젝트 탐색 시작"}</UiText>
        </li>
      </UiOl>
    </div>
  );
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
      <ExplorerLayout sidebar={<OnboardingSidebar />}>
        <ExplorerHero
          title={<UiText>{"가입 정보 입력"}</UiText>}
          description={<UiText>{"최초 한 번만 입력하며, 팀과 프로젝트 참여에 필요한 연락 정보로 사용됩니다."}</UiText>}
          mark={<UiText>{"1"}</UiText>}
        />
        <section aria-labelledby="student-onboarding-title" className="page-enter pt-7">
          <div className="pb-6">
            <h2 id="student-onboarding-title" className="text-lg font-extrabold tracking-[-0.025em] text-[var(--ink)]">
              <UiText>{"학생 기본 정보"}</UiText>
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              <UiText>{"입력한 정보는 계정 식별과 프로젝트 팀 연락에 사용됩니다."}</UiText>
            </p>
          </div>
          <StudentOnboardingForm defaultName={user.name} />
        </section>
      </ExplorerLayout>
    </AppShell>
  );
}
