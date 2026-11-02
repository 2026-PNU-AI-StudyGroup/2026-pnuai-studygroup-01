import Link from "next/link";
import { UiUl } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";

import type { StudentTeamSummary } from "@/modules/student-team/application/student-team-ports";
import { Pill } from "@/modules/project-program/ui/work-screen";

// 팀, 내 역할, 구성원, 모집 중, 검토 대기, 할 일. 목록 폭이 46rem 아래면 팀 이름 밑으로 흐른다.
const teamRowGrid = "@min-[46rem]:grid-cols-[minmax(0,1fr)_4rem_minmax(0,12rem)_4.5rem_4.5rem_13rem]";
const cellLabel = "text-xs text-[var(--muted)] @min-[46rem]:sr-only";

/** 내 팀 목록. 줄마다 팀 상태를 숫자로 맞춰 적고, 손볼 일이 있는 팀에만 검토 버튼을 단다. */
export function StudentTeamLedger({ teams, actorId }: {
  teams: StudentTeamSummary[];
  actorId: string;
}) {
  return (
    <>
      <div aria-hidden="true" className={`hidden h-9 items-center gap-x-5 px-5 text-xs text-[var(--muted)] @min-[46rem]:grid ${teamRowGrid}`}>
        <span><UiText>{"팀"}</UiText></span>
        <span><UiText>{"내 역할"}</UiText></span>
        <span><UiText>{"구성원"}</UiText></span>
        <span className="text-right"><UiText>{"모집 중"}</UiText></span>
        <span className="text-right"><UiText>{"검토 대기"}</UiText></span>
        <span />
      </div>
      <UiUl aria-label="참여 중인 팀 목록">
        {teams.map((team) => {
          const isLeader = team.leaderId === actorId;
          const reviewable = isLeader && team.pendingApplicantCount > 0;
          return (
            <li key={team.id} className={`grid grid-cols-[minmax(0,1fr)_auto] gap-x-5 gap-y-2 border-t border-[var(--line)] px-5 py-3 transition-colors hover:bg-[#fafbfc] @min-[46rem]:items-center ${teamRowGrid}`}>
              <div className="min-w-0">
                <h3 className="truncate text-sm font-medium leading-5 text-[var(--ink)]">{team.name}</h3>
                {team.description ? <p className="mt-0.5 truncate text-[0.8125rem] leading-[1.125rem] text-[var(--muted)]"><UiText>{team.description}</UiText></p> : null}
              </div>
              <div className="self-start @min-[46rem]:self-auto"><Pill tone={isLeader ? "accent" : "plain"}>{isLeader ? "팀장" : "팀원"}</Pill></div>
              <div className="col-span-2 min-w-0 text-[0.8125rem] leading-[1.125rem] @min-[46rem]:col-span-1">
                <p className="tabular-nums text-[var(--ink)]"><span className={cellLabel}><UiText>{"구성원"}</UiText>{" "}</span>{team.members.length}<UiText>{"명"}</UiText></p>
                <p className="truncate text-xs text-[var(--muted)]">{team.members.map(({ name }) => name).join(", ")}</p>
              </div>
              <p className="text-[0.8125rem] tabular-nums text-[var(--ink)] @min-[46rem]:text-right">
                <span className={cellLabel}><UiText>{"모집 중"}</UiText>{" "}</span>{team.openRecruitmentCount}<UiText>{"건"}</UiText>
              </p>
              <p className={`text-[0.8125rem] tabular-nums @min-[46rem]:text-right ${reviewable ? "font-semibold text-[var(--accent-ink)]" : "text-[var(--muted)]"}`}>
                <span className={`${cellLabel} font-normal`}><UiText>{"검토 대기"}</UiText>{" "}</span>{team.pendingApplicantCount}<UiText>{"명"}</UiText>
              </p>
              {/* 줄 안의 버튼은 내용 크기의 낮은 테두리 버튼. 휴대폰에서만 줄을 채운다. */}
              <div className="col-span-2 flex flex-wrap gap-1.5 @min-[46rem]:col-span-1 @min-[46rem]:justify-end @max-[46rem]:[&>a]:flex-1">
                {reviewable ? (
                  <Link href={`/recruitments/received?teamId=${team.id}`} className="button-secondary button-compact min-h-8 px-3 font-medium">
                    <UiText>{`지원자 검토 ${team.pendingApplicantCount}명`}</UiText>
                  </Link>
                ) : null}
                <Link href={`/teams/manage/${team.id}`} className="button-secondary button-compact min-h-8 px-3 font-medium"><UiText>{"팀 관리"}</UiText></Link>
              </div>
            </li>
          );
        })}
      </UiUl>
    </>
  );
}
