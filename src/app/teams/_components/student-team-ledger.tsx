import Link from "next/link";

import type { StudentTeamSummary } from "@/modules/student-team/application/student-team-ports";
import { StatusBadge } from "@/shared/ui/page-primitives";

const teamLedgerColumns = "xl:grid-cols-[minmax(18rem,1.55fr)_7rem_minmax(12rem,.85fr)_8rem_7.5rem]";

export function StudentTeamLedger({ teams, actorId }: {
  teams: StudentTeamSummary[];
  actorId: string;
}) {
  return (
    <div>
      <div aria-hidden="true" className={`hidden border-y border-[var(--line)] px-2 py-3 text-xs font-bold text-[var(--muted)] xl:grid xl:gap-5 ${teamLedgerColumns}`}>
        <span>팀</span>
        <span>내 역할</span>
        <span>구성원</span>
        <span>검토 대기</span>
        <span className="text-right">관리</span>
      </div>
      <ul aria-label="참여 중인 팀 목록" className="divide-y divide-[var(--line)] border-y border-[var(--line)] bg-white xl:border-t-0">
        {teams.map((team) => {
          const isLeader = team.leaderId === actorId;
          return (
            <li key={team.id} className={`record-row grid gap-5 px-2 py-6 xl:items-center xl:gap-5 ${teamLedgerColumns}`}>
              <div className="min-w-0">
                <p className="mb-1 text-xs font-bold text-[var(--muted)] xl:hidden">팀</p>
                <h3 className="text-lg font-semibold tracking-[-0.02em] text-[var(--ink)]">
                  <Link className="underline-offset-4 hover:text-[var(--primary-hover)] hover:underline" href={`/teams/manage/${team.id}`}>{team.name}</Link>
                </h3>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--muted)]">
                  {team.description || "등록된 팀 소개 없음"}
                </p>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-bold text-[var(--muted)] xl:hidden">내 역할</p>
                <StatusBadge tone={isLeader ? "info" : "neutral"}>{isLeader ? "팀장" : "팀원"}</StatusBadge>
              </div>
              <div className="min-w-0">
                <p className="mb-1 text-xs font-bold text-[var(--muted)] xl:hidden">구성원</p>
                <p className="text-sm font-semibold">{team.members.length}명</p>
                <p className="mt-1 truncate text-xs text-[var(--muted)]">{team.members.map(({ name }) => name).join(", ")}</p>
              </div>
              <div>
                <p className="mb-1 text-xs font-bold text-[var(--muted)] xl:hidden">검토 대기</p>
                <p className={`text-sm font-semibold ${team.pendingApplicantCount ? "text-[var(--primary-hover)]" : "text-[var(--muted)]"}`}>
                  {team.pendingApplicantCount ? `${team.pendingApplicantCount}명` : "없음"}
                </p>
              </div>
              <div className="xl:text-right">
                <p className="mb-1 text-xs font-bold text-[var(--muted)] xl:hidden">관리</p>
                <Link href={`/teams/manage/${team.id}`} className="button-secondary">
                  팀 관리
                  <svg aria-hidden="true" viewBox="0 0 20 20" className="ml-1.5 size-4 fill-none stroke-current stroke-[1.75]">
                    <path d="M4 10h11M11 6l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
