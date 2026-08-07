import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiSection } from "@/modules/translation/ui/localized-elements";
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
              title="팀원 모집"
              meta={<span><UiText>{"모집 중"}</UiText>{" "}{data.total}<UiText>{"건"}</UiText></span>}
              action={<Link className="button-primary" href="/recruitments/mine?modal=new"><UiText>{"모집 공고 작성"}</UiText></Link>}
            />
            <UiSection aria-label="팀원 모집 목록" className="space-y-6">
              <RecruitmentPostList actorId={actor.id} data={data} profile={profile} />
              <StudentTeamPagination page={data.page} totalPages={data.totalPages} total={data.total} href={pageHref} />
            </UiSection>
          </div>
        </StudentTeamSectionLayout>
      </main>
    </AppShell>
  );
}
import Link from "next/link";
