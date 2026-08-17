import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "@/app/_components/app-shell";
import { PrivacyNoticeStep } from "@/app/onboarding/_components/privacy-notice-step";
import { StudentOnboardingForm } from "@/app/onboarding/_components/student-onboarding-form";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { ExplorerHero } from "@/shared/ui/explorer-hero";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("가입 정보 입력");
}

function landingPathFor(role: string) {
  return role === "ADVISOR" ? "/advisor" : "/topics";
}

export default async function OnboardingPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: actor.id },
    select: {
      name: true,
      privacyNoticeAckAt: true,
      onboardingRequired: true,
      onboardingCompletedAt: true,
    },
  });
  if (!user) redirect("/");

  // 처리방침 확인이 먼저고, 학생만 그 뒤 가입 정보를 채운다. 둘 다 끝났으면 각자 첫 화면으로 보낸다.
  const needsPrivacyNotice = !user.privacyNoticeAckAt;
  const needsStudentProfile =
    actor.role === "STUDENT" && user.onboardingRequired && !user.onboardingCompletedAt;
  if (!needsPrivacyNotice && !needsStudentProfile) {
    redirect(landingPathFor(actor.role));
  }

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/onboarding">
      <main className="content-shell page-enter pb-24 lg:pb-12">
        <div className="mx-auto max-w-4xl">
          <ExplorerHero
            title={<UiText>{needsPrivacyNotice ? "이용 전 확인" : "가입 정보 입력"}</UiText>}
            description={
              <UiText>
                {needsPrivacyNotice
                  ? "최초 로그인 시 한 번만 확인합니다."
                  : "최초 한 번만 입력하며, 팀과 프로젝트 참여에 필요한 연락 정보로 사용됩니다."}
              </UiText>
            }
          />
          <div className="pt-7">
            {needsPrivacyNotice ? (
              <PrivacyNoticeStep />
            ) : (
              <section aria-labelledby="student-onboarding-title" className="page-enter">
                <div className="pb-6">
                  <h2 id="student-onboarding-title" className="text-lg font-bold tracking-[-0.025em] text-[var(--ink)]">
                    <UiText>{"학생 기본 정보"}</UiText>
                  </h2>
                </div>
                <StudentOnboardingForm defaultName={user.name} />
              </section>
            )}
          </div>
        </div>
      </main>
    </AppShell>
  );
}
