import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { RecruitmentPostList } from "@/app/recruitments/_components/recruitment-post-list";
import { StudentProfileService } from "@/modules/identity/application/manage-student-profile";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { PrismaStudentProfileRepository } from "@/modules/identity/infrastructure/prisma-student-profile-repository";
import { StudentTeamRecruitmentQueryService } from "@/modules/student-team/application/manage-student-team-recruitment";
import { PrismaStudentTeamRecruitmentQueryRepository } from "@/modules/student-team/infrastructure/prisma-student-team-recruitment-query-repository";
import {
  StudentTeamPageIntro,
  StudentTeamPagination,
  StudentTeamSectionLayout,
} from "@/modules/student-team/ui/student-team-section-layout";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";
import { firstSearchParam, type SearchParamValue } from "@/shared/ui/search-param";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("팀원 모집");
}

export default async function RecruitmentsPage({ searchParams }: { searchParams: Promise<{ page?: SearchParamValue }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "STUDENT") redirect("/topics");
  const params = await searchParams;
  const requestedPage = Number(firstSearchParam(params.page) ?? "1");
  const [data, profile] = await Promise.all([
    new StudentTeamRecruitmentQueryService(
      new PrismaStudentTeamRecruitmentQueryRepository(prisma),
    ).listPosts(actor, requestedPage),
    new StudentProfileService(new PrismaStudentProfileRepository(prisma)).get(actor),
  ]);
  const pageHref = (page: number) => page > 1 ? `/recruitments?page=${page}` : "/recruitments";

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/recruitments">
      <main className="page-enter pb-28 lg:min-h-screen lg:pb-0">
        <StudentTeamSectionLayout currentPath="/recruitments">
          <div className="space-y-5">
            <StudentTeamPageIntro
              title="팀 찾기"
              description="모집 중인 팀의 역할과 기술, 활동 가능 시간을 비교해 참여할 팀을 찾으세요."
              meta={<span><UiText>{"모집 중인 팀"}</UiText>{" "}{data.total}<UiText>{"개"}</UiText></span>}
            />
            <section aria-labelledby="open-recruitments-title" className="space-y-6">
              <div className="flex items-end justify-between gap-6">
                <div>
                  <h2 id="open-recruitments-title" className="text-2xl font-bold tracking-[-0.035em] text-[var(--ink)]"><UiText>{"팀원 모집"}</UiText></h2>
                  <p className="mt-1 text-sm text-[var(--muted)]"><UiText>{"필요한 역할과 기술, 활동 가능 시간을 비교할 수 있습니다."}</UiText></p>
                </div>
                <span className="text-sm font-semibold text-[var(--ink)]">{data.total}<UiText>{"개"}</UiText></span>
              </div>
              <RecruitmentPostList actorId={actor.id} data={data} profile={profile} />
              <StudentTeamPagination page={data.page} totalPages={data.totalPages} total={data.total} href={pageHref} />
            </section>
          </div>
        </StudentTeamSectionLayout>
      </main>
    </AppShell>
  );
}
