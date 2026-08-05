import Link from "next/link";
import { UiUl } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";

import type { StudentTeamSummary } from "@/modules/student-team/application/student-team-ports";
import { StatusBadge } from "@/shared/ui/page-primitives";

const teamLedgerColumns = "xl:grid-cols-[minmax(18rem,1.55fr)_7rem_minmax(12rem,.85fr)_8rem_7.5rem]";

export function StudentTeamLedger({ teams, actorId }: {
  teams: StudentTeamSummary[];
  actorId: string;
}) {
  return (
    <div>
      <div aria-hidden="true" className={`hidden border-y border-[var(--line)] px-2 py-3 text-xs font-semibold text-[var(--muted)] xl:grid xl:gap-5 ${teamLedgerColumns}`}>
        <span><UiText>{"팀"}</UiText></span>
        <span><UiText>{"내 역할"}</UiText></span>
        <span><UiText>{"구성원"}</UiText></span>
        <span><UiText>{"검토 대기"}</UiText></span>
        <span className="text-right"><UiText>{"관리"}</UiText></span>
      </div>
      <UiUl aria-label="참여 중인 팀 목록" className="divide-y divide-[var(--line)] border-y border-[var(--line)] bg-white xl:border-t-0">
        {teams.map((team) => {
          const isLeader = team.leaderId === actorId;
          return (
            <li key={team.id} className={`record-row grid gap-5 px-2 py-6 xl:items-center xl:gap-5 ${teamLedgerColumns}`}>
              <div className="min-w-0">
                <p className="mb-1 text-xs font-semibold text-[var(--muted)] xl:hidden"><UiText>{"팀"}</UiText></p>
                <h3 className="text-lg font-semibold tracking-[-0.02em] text-[var(--ink)]">
                  <Link className="underline-offset-4 hover:text-[var(--primary-hover)] hover:underline" href={`/teams/manage/${team.id}`}>{team.name}</Link>
                </h3>
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--muted)]">
                  <UiText>{team.description || "등록된 팀 소개 없음"}</UiText>
                </p>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-semibold text-[var(--muted)] xl:hidden"><UiText>{"내 역할"}</UiText></p>
                <StatusBadge tone={isLeader ? "info" : "neutral"}><UiText>{isLeader ? "팀장" : "팀원"}</UiText></StatusBadge>
              </div>
              <div className="min-w-0">
                <p className="mb-1 text-xs font-semibold text-[var(--muted)] xl:hidden"><UiText>{"구성원"}</UiText></p>
                <p className="text-sm font-semibold">{team.members.length}<UiText>{"명"}</UiText></p>
                <p className="mt-1 truncate text-xs text-[var(--muted)]">{team.members.map(({ name }) => name).join(", ")}</p>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-[var(--muted)] xl:hidden"><UiText>{"검토 대기"}</UiText></p>
                <p className={`text-sm font-semibold ${team.pendingApplicantCount ? "text-[var(--primary-hover)]" : "text-[var(--muted)]"}`}>
                  <UiText>{team.pendingApplicantCount ? `${team.pendingApplicantCount}명` : "없음"}</UiText>
                </p>
              </div>
              <div className="xl:text-right">
                <p className="mb-1 text-xs font-semibold text-[var(--muted)] xl:hidden"><UiText>{"관리"}</UiText></p>
                <Link href={`/teams/manage/${team.id}`} className="button-secondary">
                  <UiText>{"팀 관리"}</UiText><svg aria-hidden="true" viewBox="0 0 20 20" className="ml-1.5 size-4 fill-none stroke-current stroke-[1.75]">
                    <path d="M4 10h11M11 6l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              </div>
            </li>
          );
        })}
      </UiUl>
    </div>
  );
}
