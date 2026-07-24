import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { RecruitmentPostForm } from "@/app/recruitments/_components/recruitment-post-form";
import { RecruitmentPageIntro, RecruitmentSectionLayout } from "@/app/recruitments/_components/recruitment-section-layout";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { RecruitmentService } from "@/modules/recruitment/application/manage-recruitment";
import { PrismaRecruitmentRepository } from "@/modules/recruitment/infrastructure/prisma-recruitment-repository";
import { PrismaTopicApplicationRepository } from "@/modules/topic-application/infrastructure/prisma-topic-application-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";
import { EmptyState } from "@/shared/ui/page-primitives";

export const metadata: Metadata = { title: "새 모집" };

export default async function NewRecruitmentPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "STUDENT") redirect("/topics");
  const teams = await new RecruitmentService(
    new PrismaRecruitmentRepository(prisma),
    new PrismaTopicApplicationRepository(prisma),
  ).listFormingTeams(actor);

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/recruitments/new">
      <main className="content-shell">
        <RecruitmentSectionLayout currentPath="/recruitments/new"><div className="space-y-8">
          <RecruitmentPageIntro label="새 모집" title="함께할 동료 찾기" description="필요한 역할과 기술, 함께할 시간을 분명하게 알려주세요." />
          {teams.length ? <RecruitmentPostForm teams={teams} successHref="/recruitments/mine" /> : <EmptyState title="새 모집을 만들 수 있는 팀이 없습니다" description="모집 기간 중인 팀에 참여하면 동료 찾기를 시작할 수 있습니다." />}
        </div></RecruitmentSectionLayout>
      </main>
    </AppShell>
  );
}
