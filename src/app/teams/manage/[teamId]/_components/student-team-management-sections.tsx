import Link from "next/link";
import { UiUl } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";

import {
  DeleteStudentTeamForm,
  InviteStudentTeamMemberForm,
  TeamMemberActions,
} from "@/app/teams/_components/student-team-controls";
import type { StudentTeamSummary } from "@/modules/student-team/application/student-team-ports";
import { StatusBadge } from "@/shared/ui/page-primitives";

export function StudentTeamManagementSections({
  team,
  actorId,
}: {
  team: StudentTeamSummary;
  actorId: string;
}) {
  const isLeader = team.leaderId === actorId;

  return (
    <div className="space-y-10">
      <Link className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--muted)] hover:text-[var(--ink)]" href="/teams">
        <svg aria-hidden="true" viewBox="0 0 20 20" className="mr-2 size-4 fill-none stroke-current stroke-[1.75]">
          <path d="m12 5-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <UiText>{"내 팀"}</UiText></Link>

      <header className="flex flex-col gap-6 border-y border-[var(--line)] bg-white px-2 py-7 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge tone={isLeader ? "info" : "neutral"}><UiText>{isLeader ? "내가 팀장" : "팀원"}</UiText></StatusBadge>
            <span className="text-sm text-[var(--muted)]"><UiText>{"구성원"}</UiText>{" "}{team.members.length}<UiText>{"명"}</UiText></span>
          </div>
          <h1 className="mt-3 text-[clamp(2.3rem,4vw,3.5rem)] font-bold leading-none tracking-[-0.055em] text-[var(--ink)]">{team.name}</h1>
          {team.description ? <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--muted)]"><UiText>{team.description}</UiText></p> : null}
        </div>
        {isLeader ? <Link className="button-secondary shrink-0" href={`/recruitments/mine?modal=new&teamId=${team.id}`}><UiText>{"팀원 모집 공고"}</UiText></Link> : null}
      </header>

      <div className={`grid gap-6 ${isLeader ? "2xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,.65fr)]" : ""}`}>
        <section aria-labelledby="members-title" className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-white p-6 sm:p-7">
          <div className="flex items-end justify-between gap-4 border-b border-[var(--line)] pb-4">
            <div>
              <h2 id="members-title" className="text-xl font-bold tracking-[-0.03em]"><UiText>{"구성원"}</UiText></h2>
            </div>
            <span className="text-sm font-semibold text-[var(--muted)]">{team.members.length}<UiText>{"명"}</UiText></span>
          </div>
          <div aria-hidden="true" className="hidden grid-cols-[minmax(0,1fr)_8rem_auto] gap-4 border-b border-[var(--line)] px-2 py-3 text-xs font-semibold text-[var(--muted)] sm:grid">
            <span><UiText>{"구성원"}</UiText></span><span><UiText>{"역할"}</UiText></span><span className="text-right"><UiText>{"관리"}</UiText></span>
          </div>
          <UiUl aria-label="팀 구성원 목록" className="divide-y divide-[var(--line)] border-b border-[var(--line)]">
            {team.members.map((member) => (
              <li key={member.studentId} className="record-row grid gap-4 px-2 py-5 sm:grid-cols-[minmax(0,1fr)_8rem_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="mb-1 text-xs font-semibold text-[var(--muted)] sm:hidden"><UiText>{"구성원"}</UiText></p>
                  <strong>{member.name}</strong>
                  <p className="mt-1 truncate text-sm text-[var(--muted)]">{member.email}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs font-semibold text-[var(--muted)] sm:hidden"><UiText>{"역할"}</UiText></p>
                  <StatusBadge tone={member.role === "LEADER" ? "info" : "neutral"}><UiText>{member.role === "LEADER" ? "팀장" : "팀원"}</UiText></StatusBadge>
                </div>
                <div className="sm:justify-self-end">
                  <p className="mb-1 text-xs font-semibold text-[var(--muted)] sm:hidden"><UiText>{"관리"}</UiText></p>
                  {isLeader && member.role !== "LEADER" ? <TeamMemberActions teamId={team.id} studentId={member.studentId} studentName={member.name} /> : <span className="text-sm text-[var(--muted)]">—</span>}
                </div>
              </li>
            ))}
          </UiUl>
        </section>

        {isLeader ? (
          <section aria-labelledby="invite-title" className="rounded-[var(--radius-panel)] border border-[var(--line)] bg-white p-6 sm:p-7">
            <div className="border-b border-[var(--line)] pb-4">
              <h2 id="invite-title" className="text-xl font-bold tracking-[-0.03em]"><UiText>{"팀원 초대"}</UiText></h2>
              <p className="mt-1 text-sm text-[var(--muted)]"><UiText>{"부산대학교 이메일로 초대를 보냅니다."}</UiText></p>
            </div>
            <div className="border-b border-[var(--line)] py-5"><InviteStudentTeamMemberForm teamId={team.id} /></div>
            {team.invitations.length ? (
              <div className="pt-5">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-sm font-semibold"><UiText>{"응답 대기"}</UiText></h3>
                  <span className="text-sm text-[var(--muted)]">{team.invitations.length}<UiText>{"건"}</UiText></span>
                </div>
                <UiUl aria-label="응답 대기 중인 팀 초대" className="mt-3 divide-y divide-[var(--line)] border-y border-[var(--line)]">
                  {team.invitations.map((invite) => (
                    <li key={invite.id} className="grid gap-2 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                      <span className="min-w-0 truncate font-semibold">{invite.email}</span>
                      <span className="text-xs font-semibold text-[var(--muted)]"><UiText>{"응답 대기"}</UiText></span>
                    </li>
                  ))}
                </UiUl>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>

      {isLeader ? (
        <section aria-labelledby="danger-title" className="flex flex-col gap-5 border-y border-[var(--line)] bg-white px-2 py-7 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="danger-title" className="text-sm font-bold text-[var(--ink)]"><UiText>{"팀 삭제"}</UiText></h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]"><UiText>{"팀을 삭제해도 이미 결성된 프로젝트와 지난 프로젝트 기록은 유지됩니다."}</UiText></p>
          </div>
          <div className="shrink-0"><DeleteStudentTeamForm teamId={team.id} teamName={team.name} /></div>
        </section>
      ) : null}
    </div>
  );
}
