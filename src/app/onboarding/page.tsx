import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "@/app/_components/app-shell";
import { PrivacyNoticeStep } from "@/app/onboarding/_components/privacy-notice-step";
import { StudentOnboardingForm } from "@/app/onboarding/_components/student-onboarding-form";
import { findAdvisorLandingPath } from "@/modules/advisor/infrastructure/prisma-advisor-landing-query";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { ExplorerHero } from "@/shared/ui/explorer-hero";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("가입 정보 입력");
}

// 자문위원의 첫 화면은 담당 프로젝트 배정 여부에 따라 갈린다. 초대만 받은 위원에게
// 담당 목록은 언제나 비어 있어 어디로 가야 할지 알 수 없다.
async function landingPathFor(role: string, userId: string) {
  if (role !== "ADVISOR") return "/topics";
  return findAdvisorLandingPath(prisma, userId);
}

export default async function OnboardingPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: actor.id },
    select: {
      name: true,
      privacyConsentAt: true,
      onboardingRequired: true,
      onboardingCompletedAt: true,
    },
  });
  if (!user) redirect("/");

  // 처리방침 동의가 먼저고, 학생만 그 뒤 가입 정보를 채운다. 둘 다 끝났으면 각자 첫 화면으로 보낸다.
  const needsPrivacyNotice = !user.privacyConsentAt;
  const needsStudentProfile =
    actor.role === "STUDENT" && user.onboardingRequired && !user.onboardingCompletedAt;
  if (!needsPrivacyNotice && !needsStudentProfile) {
    redirect(await landingPathFor(actor.role, actor.id));
  }

  // 자문위원은 초대 링크를 받아 심사하러 온 외부 인원이다. "로그인" 이라는 말도, 학생용
  // 가입 안내도 이들이 겪는 절차와 다르다.
  const isAdvisor = actor.role === "ADVISOR";

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/onboarding">
      <main className="content-shell page-enter pb-24 lg:pb-12">
        <div className="mx-auto max-w-4xl">
          <ExplorerHero
            title={
              <UiText>
                {needsPrivacyNotice
                  ? isAdvisor ? "심사 전 동의" : "이용 전 동의"
                  : "가입 정보 입력"}
              </UiText>
            }
            description={
              <UiText>
                {needsPrivacyNotice
                  ? isAdvisor
                    ? "초대 링크로 처음 들어오실 때 한 번만 동의하면 됩니다."
                    : "최초 로그인 시 한 번만 동의하면 됩니다."
                  : "최초 한 번만 입력하며, 팀과 프로젝트 참여에 필요한 연락 정보로 사용됩니다."}
              </UiText>
            }
          />
          <div className="pt-7">
            {needsPrivacyNotice ? (
              <PrivacyNoticeStep variant={isAdvisor ? "advisor" : "member"} />
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
