import Link from "next/link";
import { UiUl } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";

import type { StudentTeamSummary } from "@/modules/student-team/application/student-team-ports";
import { StatusBadge } from "@/shared/ui/page-primitives";

export function StudentTeamLedger({ teams, actorId }: {
  teams: StudentTeamSummary[];
  actorId: string;
}) {
  return (
    <UiUl aria-label="참여 중인 팀 목록" className="grid gap-6 xl:grid-cols-2">
      {teams.map((team) => {
        const isLeader = team.leaderId === actorId;
        return (
          <li key={team.id}>
            <article className="group flex h-full flex-col overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface)] transition-colors duration-200 hover:border-[var(--line-strong)]">
              <div className="px-5 pb-5 pt-6 sm:px-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3.5">
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold leading-tight text-[var(--ink)]">{team.name}</h3>
                      <p className="mt-1 truncate text-[0.8125rem] text-[var(--muted)]">{team.members.map(({ name }) => name).join(", ")}</p>
                    </div>
                  </div>
                  <StatusBadge tone={isLeader ? "info" : "neutral"}><UiText>{isLeader ? "팀장" : "팀원"}</UiText></StatusBadge>
                </div>
                {team.description ? <p className="mt-5 line-clamp-2 text-sm leading-6 text-[var(--muted)]"><UiText>{team.description}</UiText></p> : null}
              </div>

              <div className="border-t border-[var(--line)] px-5 py-5 sm:px-6">
                <dl className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[var(--radius-control)] bg-[var(--surface-subtle)] px-4 py-3.5">
                    <dt className="text-xs text-[var(--muted)]"><UiText>{"구성원"}</UiText></dt>
                    <dd className="mt-1 text-lg font-semibold tabular-nums text-[var(--ink)]">{team.members.length}<UiText>{"명"}</UiText></dd>
                  </div>
                  <div className="rounded-[var(--radius-control)] bg-[var(--surface-subtle)] px-4 py-3.5">
                    <dt className="text-xs text-[var(--muted)]"><UiText>{"모집 중"}</UiText></dt>
                    <dd className="mt-1 text-lg font-semibold tabular-nums text-[var(--ink)]">{team.openRecruitmentCount}<UiText>{"건"}</UiText></dd>
                  </div>
                </dl>
                <p className="mt-4 text-sm text-[var(--muted)]"><UiText>{"검토 대기"}</UiText>{" "}<span className={team.pendingApplicantCount ? "font-semibold text-[var(--accent)]" : "text-[var(--muted)]"}><UiText>{team.pendingApplicantCount ? `${team.pendingApplicantCount}명` : "없음"}</UiText></span></p>
              </div>

              <div className="mt-auto border-t border-[var(--line)] px-5 py-4 sm:px-6">
                {isLeader && team.pendingApplicantCount > 0 ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Link href={`/recruitments/received?teamId=${team.id}`} className="button-primary justify-center">
                      <UiText>{`지원자 검토 ${team.pendingApplicantCount}명`}</UiText>
                    </Link>
                    <Link href={`/teams/manage/${team.id}`} className="button-secondary justify-center"><UiText>{"팀 관리"}</UiText></Link>
                  </div>
                ) : (
                  <Link href={`/teams/manage/${team.id}`} className="button-secondary w-full justify-center">
                    <UiText>{"팀 관리"}</UiText><svg aria-hidden="true" viewBox="0 0 20 20" className="ml-1.5 size-4 fill-none stroke-current stroke-[1.75]">
                      <path d="M4 10h11M11 6l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                )}
              </div>
            </article>
          </li>
        );
      })}
    </UiUl>
  );
}
