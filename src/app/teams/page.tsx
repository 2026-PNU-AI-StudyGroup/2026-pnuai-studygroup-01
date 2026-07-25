import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/app/_components/app-shell";
import {
  CreateStudentTeamForm,
  InvitationDecisionForm,
} from "@/app/teams/_components/student-team-controls";
import { StudentTeamLedger } from "@/app/teams/_components/student-team-ledger";
import { StudentTeamSectionLayout } from "@/modules/student-team/ui/student-team-section-layout";
import { TeamModal } from "@/modules/student-team/ui/team-modal";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { StudentTeamService } from "@/modules/student-team/application/manage-student-teams";
import { PrismaStudentTeamRepository } from "@/modules/student-team/infrastructure/prisma-student-team-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { EmptyState } from "@/shared/ui/page-primitives";

export const metadata: Metadata = { title: "팀 관리" };

export default async function StudentTeamsPage({
  searchParams,
}: {
  searchParams: Promise<{ modal?: string }>;
}) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "STUDENT") redirect("/dashboard");
  const { modal } = await searchParams;

  const { teams, invitations } = await new StudentTeamService(
    new PrismaStudentTeamRepository(prisma),
  ).listWorkspace(actor);

  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/teams">
      <main className="page-enter pb-28 lg:min-h-screen lg:pb-0">
        <StudentTeamSectionLayout currentPath="/teams">
          <div className="space-y-8">
            <header className="flex flex-col gap-6 border-b border-[var(--line)] pb-8 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-black text-[var(--primary)]">지속형 팀</p>
                <h1 className="mt-2 text-[clamp(2.3rem,4vw,3.5rem)] font-black leading-none tracking-[-0.055em] text-[var(--ink)]">
                  내 팀
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)]">
                  프로젝트에 지원할 팀을 만들고 관리합니다. 프로젝트 지원은 팀장만 할 수 있습니다.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link className="button-secondary" href="/teams?modal=invitations">
                  받은 초대 {invitations.length ? `${invitations.length}` : ""}
                </Link>
                <Link className="button-primary" href="/teams?modal=create">새 팀 만들기</Link>
              </div>
            </header>

            <section aria-labelledby="my-teams-title">
              <div className="mb-5 flex items-end justify-between gap-4">
                <div>
                  <h2 id="my-teams-title" className="text-2xl font-black tracking-[-0.035em]">참여 중인 팀</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">팀을 선택해 구성원과 초대를 관리하세요.</p>
                </div>
                <span className="text-sm font-bold text-[var(--muted)]">{teams.length}개</span>
              </div>

              {teams.length === 0 ? (
                <EmptyState
                  title="아직 참여 중인 팀이 없습니다"
                  description="새 팀을 만들면 본인이 팀장이 됩니다."
                  action={<Link className="button-primary" href="/teams?modal=create">첫 팀 만들기</Link>}
                />
              ) : (
                <StudentTeamLedger teams={teams} actorId={actor.id} />
              )}
            </section>

            <aside className="flex flex-col gap-4 rounded-[var(--radius-panel)] border border-[var(--line)] bg-white p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
              <div>
                <strong className="text-sm text-[var(--ink)]">학생 프로젝트를 제안할 수 있습니다.</strong>
                <p className="mt-1 text-sm text-[var(--muted)]">교수를 지정하거나 관리자 승인을 요청하세요.</p>
              </div>
              <Link className="button-quiet" href="/projects/new">학생 프로젝트 제안</Link>
            </aside>
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
                        <p className="mt-1 text-sm text-[var(--muted)]">팀장 {invitation.leaderName}</p>
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
