import Link from "next/link";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "@/app/_components/app-shell";
import {
  CreateStudentTeamForm,
  InvitationDecisionForm,
} from "@/app/teams/_components/student-team-controls";
import { StudentTeamLedger } from "@/app/teams/_components/student-team-ledger";
import { StudentTeamPageIntro, StudentTeamSectionLayout } from "@/modules/student-team/ui/student-team-section-layout";
import { TeamModal } from "@/modules/student-team/ui/team-modal";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { StudentTeamQueryService } from "@/modules/student-team/application/manage-student-teams";
import { PrismaStudentTeamQueryRepository } from "@/modules/student-team/infrastructure/prisma-student-team-query-repository";
import { ProjectProgramService } from "@/modules/project-program/application/manage-project-programs";
import { PrismaProjectProgramRepository } from "@/modules/project-program/infrastructure/prisma-project-program-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { EmptyState } from "@/shared/ui/page-primitives";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("팀 관리");
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

  const [{ teams, invitations }, studentCreatablePrograms] = await Promise.all([
    new StudentTeamQueryService(
      new PrismaStudentTeamQueryRepository(prisma),
    ).listWorkspace(actor),
    new ProjectProgramService(new PrismaProjectProgramRepository(prisma)).listStudentCreatableOpen(),
  ]);

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/teams">
      <main className="page-enter pb-28 lg:min-h-screen lg:pb-0">
        <StudentTeamSectionLayout currentPath="/teams">
          <div className="space-y-5">
            <StudentTeamPageIntro
              title="내 팀"
              description="프로젝트에 지원할 팀을 만들고 관리합니다. 프로젝트 지원은 팀장만 할 수 있습니다."
              meta={<span><UiText>{"참여 중인 팀"}</UiText>{" "}{teams.length}<UiText>{"개"}</UiText></span>}
              action={
                <div className="flex flex-wrap gap-2">
                <Link className="button-secondary" href="/teams?modal=invitations">
                  <UiText>{"받은 초대"}</UiText>{invitations.length ? `${invitations.length}` : ""}
                </Link>
                <Link className="button-primary" href="/teams?modal=create"><UiText>{"새 팀 만들기"}</UiText></Link>
                </div>
              }
            />

            <section aria-labelledby="my-teams-title">
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <h2 id="my-teams-title" className="text-2xl font-black tracking-[-0.035em]"><UiText>{"참여 중인 팀"}</UiText></h2>
                  <p className="mt-1 text-sm text-[var(--muted)]"><UiText>{"팀을 선택해 구성원과 초대를 관리하세요."}</UiText></p>
                </div>
                <span className="text-sm font-bold text-[var(--muted)]">{teams.length}<UiText>{"개"}</UiText></span>
              </div>

              {teams.length === 0 ? (
                <EmptyState
                  title="아직 참여 중인 팀이 없습니다"
                  description="새 팀을 만들면 본인이 팀장이 됩니다."
                  action={<Link className="button-primary" href="/teams?modal=create"><UiText>{"첫 팀 만들기"}</UiText></Link>}
                />
              ) : (
                <StudentTeamLedger teams={teams} actorId={actor.id} />
              )}
            </section>

            {studentCreatablePrograms.length ? <aside className="flex flex-col gap-4 rounded-[var(--radius-panel)] border border-[var(--line)] bg-white p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
              <div>
                <strong className="text-sm text-[var(--ink)]"><UiText>{"학생 프로젝트를 제안할 수 있습니다."}</UiText></strong>
                <p className="mt-1 text-sm text-[var(--muted)]"><UiText>{"프로그램 설정에 맞는 승인 요청을 보내세요."}</UiText></p>
              </div>
              <Link className="button-quiet" href="/projects/new"><UiText>{"학생 프로젝트 제안"}</UiText></Link>
            </aside> : null}
          </div>

          {modal === "create" ? (
            <TeamModal
              title="새 팀 만들기"
              description="팀을 만들면 팀장으로 시작합니다. 구성원은 팀을 만든 뒤 초대할 수 있습니다."
            >
              <CreateStudentTeamForm successHref="/teams" />
            </TeamModal>
          ) : null}

          {modal === "invitations" ? (
            <TeamModal title="받은 팀 초대" description="참여할 팀인지 확인한 뒤 응답하세요.">
              {invitations.length === 0 ? (
                <EmptyState variant="embedded" title="응답할 초대가 없습니다" description="새 초대가 오면 이곳에서 확인할 수 있습니다." />
              ) : (
                <ul className="max-h-[60vh] divide-y divide-[var(--line)] overflow-y-auto border-y border-[var(--line)]">
                  {invitations.map((invitation) => (
                    <li key={invitation.id} className="grid gap-4 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                      <div>
                        <strong>{invitation.teamName}</strong>
                        <p className="mt-1 text-sm text-[var(--muted)]"><UiText>{"팀장"}</UiText>{" "}{invitation.leaderName}</p>
                      </div>
                      <InvitationDecisionForm invitationId={invitation.id} />
                    </li>
                  ))}
                </ul>
              )}
            </TeamModal>
          ) : null}
        </StudentTeamSectionLayout>
      </main>
    </AppShell>
  );
}
