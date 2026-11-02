import Link from "next/link";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { StudentTeamRecruitmentQueryService } from "@/modules/student-team/application/manage-student-team-recruitment";
import { PrismaStudentTeamRecruitmentQueryRepository } from "@/modules/student-team/infrastructure/prisma-student-team-recruitment-query-repository";
import {
  StudentTeamPageIntro,
  StudentTeamPagination,
  StudentTeamPanel,
  StudentTeamSectionLayout,
} from "@/modules/student-team/ui/student-team-section-layout";
import { SentApplicationList } from "@/app/recruitments/_components/sent-application-list";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";
import { recruitMembersEntry } from "@/app/recruitments/_lib/recruit-members-entry";
import { firstSearchParam, type SearchParamValue } from "@/shared/ui/search-param";
import { AddIcon } from "@/shared/ui/workspace-icons";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("지원 내역");
}

export default async function RecruitmentApplicationsPage({ searchParams }: { searchParams: Promise<{ page?: SearchParamValue }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "STUDENT") redirect("/topics");
  const params = await searchParams;
  const requestedPage = Number(firstSearchParam(params.page) ?? "1");
  const data = await new StudentTeamRecruitmentQueryService(
    new PrismaStudentTeamRecruitmentQueryRepository(prisma),
  ).listApplicationHistory(actor, requestedPage);
  const pageHref = (page: number) => page > 1 ? `/recruitments/applications?page=${page}` : "/recruitments/applications";
  const recruitEntry = await recruitMembersEntry(actor);

  // 상태별 수는 한 쪽에 다 보일 때만 센다. 여러 쪽이면 이 쪽 몇 건만 세게 되어 틀린 수가 된다.
  const counted = data.totalPages <= 1;
  const pending = data.applications.filter(({ status }) => status === "PENDING").length;
  const accepted = data.applications.filter(({ status }) => status === "ACCEPTED").length;
  const finding = !counted || data.total === 0 ? undefined : pending ? (
    <><b className="font-semibold"><UiText>{`검토 중인 지원 ${pending}건`}</UiText></b>{", "}<UiText>{"팀장이 수락하면 그 팀의 구성원이 됩니다."}</UiText></>
  ) : accepted ? (
    <UiText>{`수락된 지원이 ${accepted}건 있습니다. 합류한 팀은 내 팀에서 볼 수 있습니다.`}</UiText>
  ) : (
    <UiText>{"검토를 기다리는 지원이 없습니다."}</UiText>
  );

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/recruitments/applications" crumbs={[{ label: "지원 내역" }]} panel={<StudentTeamPanel currentPath="/recruitments/applications" />}>
      <main className="pb-28 lg:pb-0">
        <StudentTeamSectionLayout>
          <div className="grid gap-3.5">
            <StudentTeamPageIntro
              title="지원 내역"
              finding={finding}
              action={(
                <Link className="button-primary button-compact gap-1.5" href={recruitEntry.href}>
                  <AddIcon className="size-4 shrink-0" /><UiText>{recruitEntry.label}</UiText>
                </Link>
              )}
            />

            <SentApplicationList
              data={data}
              footer={<StudentTeamPagination page={data.page} totalPages={data.totalPages} total={data.total} href={pageHref} />}
            />
          </div>
        </StudentTeamSectionLayout>
      </main>
    </AppShell>
  );
}
