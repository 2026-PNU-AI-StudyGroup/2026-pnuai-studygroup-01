import Link from "next/link";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";
import { UiUl } from "@/modules/translation/ui/localized-elements";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "@/app/_components/app-shell";
import {
  CreateStudentTeamForm,
  InvitationDecisionForm,
} from "@/app/teams/_components/student-team-controls";
import { StudentTeamLedger } from "@/app/teams/_components/student-team-ledger";
import { StudentTeamPageIntro, StudentTeamPanel, StudentTeamSectionLayout } from "@/modules/student-team/ui/student-team-section-layout";
import { TeamModal } from "@/modules/student-team/ui/team-modal";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { StudentTeamQueryService } from "@/modules/student-team/application/manage-student-teams";
import { PrismaStudentTeamQueryRepository } from "@/modules/student-team/infrastructure/prisma-student-team-query-repository";
import { cardClass, CardHead } from "@/modules/project-program/ui/work-screen";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { EmptyState } from "@/shared/ui/page-primitives";
import { AddIcon } from "@/shared/ui/workspace-icons";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("내 팀");
}

export default async function StudentTeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ modal?: string }>;
}) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "STUDENT") redirect("/dashboard");
  const { modal } = await searchParams;

  const { teams, invitations } = await new StudentTeamQueryService(
    new PrismaStudentTeamQueryRepository(prisma),
  ).listWorkspace(actor);
  const leaderTeamCount = teams.filter((team) => team.leaderId === actor.id).length;
  const pendingApplicantCount = teams
    .filter((team) => team.leaderId === actor.id)
    .reduce((total, team) => total + team.pendingApplicantCount, 0);

  // 제목 아래 한 줄: 응답할 초대와 검토할 지원자가 먼저, 없으면 팀장인 팀 수와 지원 규칙.
  const finding = invitations.length || pendingApplicantCount ? (
    <>
      {invitations.length ? <b className="font-semibold"><UiText>{`받은 팀 초대 ${invitations.length}건이 응답을 기다립니다.`}</UiText></b> : null}
      {invitations.length && pendingApplicantCount ? " " : null}
      {pendingApplicantCount ? <b className="font-semibold"><UiText>{`검토를 기다리는 지원자가 ${pendingApplicantCount}명 있습니다.`}</UiText></b> : null}
    </>
  ) : teams.length ? (
    <UiText>{`팀장인 팀 ${leaderTeamCount}개, 팀원인 팀 ${teams.length - leaderTeamCount}개. 프로젝트 지원은 팀장만 할 수 있습니다.`}</UiText>
  ) : (
    <UiText>{"프로젝트 지원은 팀장만 할 수 있습니다."}</UiText>
  );

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/teams" crumbs={[{ label: "내 팀" }]} panel={<StudentTeamPanel currentPath="/teams" />}>
      <main className="pb-28 lg:pb-0">
        <StudentTeamSectionLayout>
          <div className="grid gap-3.5">
            <StudentTeamPageIntro
              title="내 팀"
              finding={finding}
              action={teams.length > 0 ? <Link className="button-primary button-compact gap-1.5" href="/teams?modal=create"><AddIcon className="size-4 shrink-0" /><UiText>{"새 팀 만들기"}</UiText></Link> : undefined}
            />

            {/* 응답할 초대는 기다리는 일이라 팀 목록보다 먼저 둔다. 알림도 이 화면으로 온다. */}
            {invitations.length > 0 ? (
              <section aria-labelledby="team-invitations-title" className={cardClass}>
                <CardHead id="team-invitations-title" title={<UiText>{"받은 팀 초대"}</UiText>} count={<>{invitations.length}<UiText>{"건"}</UiText></>} />
                <UiUl aria-label="받은 팀 초대 목록">
                  {invitations.map((invitation) => (
                    <li key={invitation.id} className="grid gap-2.5 border-t border-[var(--line)] px-5 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium leading-5 text-[var(--ink)]">{invitation.teamName}</p>
                        <p className="mt-0.5 text-xs tabular-nums text-[var(--muted)]">
                          <UiText>{`팀장 ${invitation.leaderName}`}</UiText>, <UiDate value={invitation.createdAt} mode="date" />{" "}<UiText>{"초대"}</UiText>
                        </p>
                      </div>
                      <InvitationDecisionForm invitationId={invitation.id} />
                    </li>
                  ))}
                </UiUl>
              </section>
            ) : null}

            <section aria-labelledby="my-teams-title" className={`${cardClass} @container`}>
              <CardHead id="my-teams-title" title={<UiText>{"참여 중인 팀"}</UiText>} count={<>{teams.length}<UiText>{"개"}</UiText></>} />
              {teams.length === 0 ? (
                <div className="border-t border-[var(--line)] px-5">
                  <EmptyState
                    variant="compact"
                    title="아직 참여 중인 팀이 없습니다"
                    description="새 팀을 만들면 본인이 팀장이 됩니다."
                    action={<Link className="button-primary button-compact gap-1.5" href="/teams?modal=create"><AddIcon className="size-4 shrink-0" /><UiText>{"첫 팀 만들기"}</UiText></Link>}
                  />
                </div>
              ) : (
                <StudentTeamLedger teams={teams} actorId={actor.id} />
              )}
            </section>
          </div>

          {modal === "create" ? (
            <TeamModal
              title="새 팀 만들기"
              description="팀을 만들면 팀장으로 시작합니다. 구성원은 팀을 만든 뒤 초대할 수 있습니다."
              closeHref="/teams"
            >
              <CreateStudentTeamForm />
            </TeamModal>
          ) : null}
        </StudentTeamSectionLayout>
      </main>
    </AppShell>
  );
}
