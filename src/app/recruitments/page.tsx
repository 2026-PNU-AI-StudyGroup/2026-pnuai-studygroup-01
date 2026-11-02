import Link from "next/link";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { isOpenToApply, RecruitmentPostList } from "@/app/recruitments/_components/recruitment-post-list";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { StudentProfileService } from "@/modules/identity/application/manage-student-profile";
import { PrismaStudentProfileRepository } from "@/modules/identity/infrastructure/prisma-student-profile-repository";
import { StudentTeamRecruitmentQueryService } from "@/modules/student-team/application/manage-student-team-recruitment";
import { PrismaStudentTeamRecruitmentQueryRepository } from "@/modules/student-team/infrastructure/prisma-student-team-recruitment-query-repository";
import {
  StudentTeamPageIntro,
  StudentTeamPagination,
  StudentTeamPanel,
  StudentTeamSectionLayout,
} from "@/modules/student-team/ui/student-team-section-layout";
import { daysUntil } from "@/modules/project-program/ui/work-screen";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";
import { firstSearchParam, type SearchParamValue } from "@/shared/ui/search-param";
import { recruitMembersEntry } from "@/app/recruitments/_lib/recruit-members-entry";
import { AddIcon } from "@/shared/ui/workspace-icons";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("팀원 모집");
}

export default async function RecruitmentsPage({ searchParams }: { searchParams: Promise<{ page?: SearchParamValue }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "STUDENT") redirect("/topics");
  const params = await searchParams;
  const requestedPage = Number(firstSearchParam(params.page) ?? "1");
  const [data, contactOptions] = await Promise.all([
    new StudentTeamRecruitmentQueryService(
      new PrismaStudentTeamRecruitmentQueryRepository(prisma),
    ).listPosts(actor, requestedPage),
    new StudentProfileService(new PrismaStudentProfileRepository(prisma)).get(actor),
  ]);
  const pageHref = (page: number) => page > 1 ? `/recruitments?page=${page}` : "/recruitments";
  const recruitEntry = await recruitMembersEntry(actor);

  // 제목 아래 한 줄: 지금 지원할 수 있는 공고 수와 가장 먼저 닫히는 공고, 검토를 기다리는 내 지원.
  const now = new Date();
  const open = data.posts
    .filter((post) => isOpenToApply(post, actor.id))
    .sort((left, right) => left.deadlineAt.getTime() - right.deadlineAt.getTime());
  const soonest = open[0];
  const soonestDays = soonest ? daysUntil(soonest.deadlineAt, now) : 0;
  const waiting = data.posts.filter((post) => post.ownApplication?.status === "PENDING").length;
  const anyOthers = data.posts.some((post) => post.authorId !== actor.id);
  const finding = soonest ? (
    <>
      <b className="font-semibold"><UiText>{`지금 지원할 수 있는 공고 ${open.length}건`}</UiText></b>
      {", "}<UiText>{soonestDays === 0 ? `${soonest.teamName} 공고가 오늘 가장 먼저 마감됩니다.` : `${soonest.teamName} 공고가 ${soonestDays}일 뒤 가장 먼저 마감됩니다.`}</UiText>
      {waiting ? <>{" "}<UiText>{`내 지원 ${waiting}건은 팀장이 검토하고 있습니다.`}</UiText></> : null}
    </>
  ) : anyOthers ? (
    <UiText>{waiting ? `새로 지원할 공고는 없고, 내 지원 ${waiting}건은 팀장이 검토하고 있습니다.` : "모집 중인 공고는 정원이 찼거나 이미 지원한 공고뿐입니다."}</UiText>
  ) : undefined;

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/recruitments" crumbs={[{ label: "둘러보기" }]} panel={<StudentTeamPanel currentPath="/recruitments" />}>
      <main className="pb-28 lg:pb-0">
        <StudentTeamSectionLayout>
          <div className="grid gap-3.5">
            <StudentTeamPageIntro
              title="둘러보기"
              finding={finding}
              action={<Link className="button-primary button-compact gap-1.5" href={recruitEntry.href}><AddIcon className="size-4 shrink-0" /><UiText>{recruitEntry.label}</UiText></Link>}
            />
            <RecruitmentPostList
              actorId={actor.id}
              data={data}
              contactOptions={contactOptions}
              now={now}
              footer={<StudentTeamPagination page={data.page} totalPages={data.totalPages} total={data.total} href={pageHref} />}
            />
          </div>
        </StudentTeamSectionLayout>
      </main>
    </AppShell>
  );
}
