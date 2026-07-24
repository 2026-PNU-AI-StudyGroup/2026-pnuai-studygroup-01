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

export const metadata: Metadata = { title: "모집 글 등록" };

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
          <RecruitmentPageIntro label="새 모집" title="모집 글 등록" description="프로젝트 소개보다 필요한 역할과 실제 협업 조건이 먼저 보이도록 작성합니다. 등록한 뒤에는 ‘작성한 모집’에서 지원자를 검토할 수 있습니다." />
          {teams.length ? <RecruitmentPostForm teams={teams} successHref="/recruitments/mine" /> : <EmptyState title="모집 글을 등록할 팀이 없습니다" description="모집 기간 중인 구성 단계 팀에 먼저 참여해야 모집 글을 작성할 수 있습니다." />}
        </div></RecruitmentSectionLayout>
      </main>
    </AppShell>
  );
}
