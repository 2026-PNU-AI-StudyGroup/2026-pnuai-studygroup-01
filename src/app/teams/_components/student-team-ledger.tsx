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
            <article className="group flex h-full flex-col overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-white transition-[border-color,box-shadow] duration-200 hover:border-[#aabced] hover:shadow-[0_16px_34px_rgb(35_71_184_/_0.08)]">
              <div className="px-5 pb-5 pt-6 sm:px-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3.5">
                    <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-[0.9rem] bg-[var(--primary-subtle)] text-[var(--primary)]">
                      <svg viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-[1.8]" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="9" cy="8" r="3" />
                        <path d="M3.5 20c.2-4 2.1-6 5.5-6s5.3 2 5.5 6M16 6c2.7 0 4 1.7 4 3.5s-1.2 3.1-3 3.3M17 14.7c2.7.4 4 2.1 4 5.3" />
                      </svg>
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-[1.45rem] font-bold leading-tight tracking-[-0.035em] text-[var(--ink)]">{team.name}</h3>
                      <p className="mt-1 truncate text-xs font-medium text-[var(--muted)]">{team.members.map(({ name }) => name).join(", ")}</p>
                    </div>
                  </div>
                  <StatusBadge tone={isLeader ? "info" : "neutral"}><UiText>{isLeader ? "팀장" : "팀원"}</UiText></StatusBadge>
                </div>
                {team.description ? <p className="mt-5 line-clamp-2 text-sm leading-6 text-[var(--muted)]"><UiText>{team.description}</UiText></p> : null}
              </div>

              <div className="border-t border-[var(--line)] px-5 py-5 sm:px-6">
                <dl className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[var(--radius-control)] bg-[var(--surface-subtle)] px-4 py-3.5">
                    <dt className="text-xs font-semibold text-[var(--muted)]"><UiText>{"구성원"}</UiText></dt>
                    <dd className="mt-1 text-lg font-bold tracking-[-0.025em] text-[var(--ink)]">{team.members.length}<UiText>{"명"}</UiText></dd>
                  </div>
                  <div className="rounded-[var(--radius-control)] bg-[var(--surface-subtle)] px-4 py-3.5">
                    <dt className="text-xs font-semibold text-[var(--muted)]"><UiText>{"모집 중"}</UiText></dt>
                    <dd className="mt-1 text-lg font-bold tracking-[-0.025em] text-[var(--ink)]">{team.openRecruitmentCount}<UiText>{"건"}</UiText></dd>
                  </div>
                </dl>
                <p className="mt-4 text-sm font-semibold text-[var(--muted)]"><UiText>{"검토 대기"}</UiText>{" "}<span className={team.pendingApplicantCount ? "text-[var(--primary-hover)]" : "text-[var(--muted)]"}><UiText>{team.pendingApplicantCount ? `${team.pendingApplicantCount}명` : "없음"}</UiText></span></p>
              </div>

              <div className="mt-auto border-t border-[var(--line)] px-5 py-4 sm:px-6">
                <Link href={`/teams/manage/${team.id}`} className="button-primary w-full justify-center">
                  <UiText>{"팀 관리"}</UiText><svg aria-hidden="true" viewBox="0 0 20 20" className="ml-1.5 size-4 fill-none stroke-current stroke-[1.75]">
                    <path d="M4 10h11M11 6l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              </div>
            </article>
          </li>
        );
      })}
    </UiUl>
  );
}
