import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { RecruitmentPostForm } from "@/app/recruitments/recruitment-forms";
import { RecruitmentSectionLayout } from "@/app/recruitments/recruitment-section-layout";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { RecruitmentService } from "@/modules/recruitment/application/manage-recruitment";
import { PrismaRecruitmentRepository } from "@/modules/recruitment/infrastructure/prisma-recruitment-repository";
import { PrismaTopicApplicationRepository } from "@/modules/topic-application/infrastructure/prisma-topic-application-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/shared/ui/app-shell";
import { EmptyState, PageHeader } from "@/shared/ui/page-primitives";

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
        <RecruitmentSectionLayout currentPath="/recruitments/new"><div className="space-y-10">
          <PageHeader eyebrow="팀원 찾기" title="새 모집 글" description="필요한 기술과 역할, 함께 활동할 수 있는 시간을 명확히 적어 팀에 맞는 지원자를 찾습니다." actions={<Link className="button-quiet" href="/recruitments/mine">내 모집 글로</Link>} />
          {teams.length ? <RecruitmentPostForm teams={teams} successHref="/recruitments/mine" /> : <EmptyState title="모집 글을 등록할 팀이 없습니다" description="모집 기간 중인 구성 단계 팀에 먼저 참여해야 모집 글을 작성할 수 있습니다." action={<Link className="button-secondary" href="/recruitments/mine">내 모집 글로</Link>} />}
        </div></RecruitmentSectionLayout>
      </main>
    </AppShell>
  );
}
