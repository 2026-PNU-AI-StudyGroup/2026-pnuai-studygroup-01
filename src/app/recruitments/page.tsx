import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiSection } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { RecruitmentPostList } from "@/app/recruitments/_components/recruitment-post-list";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
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
  const data = await new StudentTeamRecruitmentQueryService(
    new PrismaStudentTeamRecruitmentQueryRepository(prisma),
  ).listPosts(actor, requestedPage);
  const pageHref = (page: number) => page > 1 ? `/recruitments?page=${page}` : "/recruitments";

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/recruitments">
      <main className="page-enter pb-28 lg:min-h-screen lg:pb-0">
        <StudentTeamSectionLayout currentPath="/recruitments">
          <div className="space-y-5">
            <StudentTeamPageIntro
              title="둘러보기"
              description="다른 팀이 올린 모집 공고를 보고 지원하세요."
              meta={<span><UiText>{"모집 중"}</UiText>{" "}{data.total}<UiText>{"건"}</UiText></span>}
              action={<Link className="button-secondary" href="/recruitments/mine"><UiText>{"모집 공고 관리"}</UiText></Link>}
            />
            <UiSection aria-label="팀원 모집 목록" className="space-y-6">
              <RecruitmentPostList actorId={actor.id} data={data} />
              <StudentTeamPagination page={data.page} totalPages={data.totalPages} total={data.total} href={pageHref} />
            </UiSection>
          </div>
        </StudentTeamSectionLayout>
      </main>
    </AppShell>
  );
}
import Link from "next/link";
