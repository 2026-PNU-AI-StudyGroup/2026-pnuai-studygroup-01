import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { listAssignedProjects } from "@/modules/advisor/infrastructure/prisma-advisor-workspace-query";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { cardClass, CardHead, Missing, Pill } from "@/modules/project-program/ui/work-screen";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { ExplorerLayout } from "@/shared/ui/explorer-layout";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("담당 프로젝트");
}

// 프로젝트, 팀, 채점, 피드백, 다음 할 일. 목록 폭이 44rem 아래면 나머지 칸이 이름 밑으로 흐른다.
const rowGrid = "@min-[44rem]:grid-cols-[minmax(0,1fr)_minmax(0,11rem)_6rem_4.5rem_4rem]";

/** 팀마다 배정된 채점표 수, 이 위원이 저장한 채점표 수, 남긴 피드백 수. 상세 화면과 같은 채점표(보관, 예전 것 제외)만 센다. */
async function reviewProgress(advisorId: string, teamIds: string[]) {
  if (!teamIds.length) return new Map<string, { rubrics: number; scored: number; feedback: number }>();
  const rubric = { archivedAt: null, legacy: false };
  const [rubrics, scored, feedback] = await Promise.all([
    prisma.projectTeamRubricEvaluation.groupBy({ by: ["projectTeamId"], where: { projectTeamId: { in: teamIds }, rubric }, _count: { _all: true } }),
    prisma.advisorEvaluation.groupBy({ by: ["projectTeamId"], where: { advisorId, projectTeamId: { in: teamIds }, rubric }, _count: { _all: true } }),
    prisma.advisorFeedback.groupBy({ by: ["projectTeamId"], where: { advisorId, projectTeamId: { in: teamIds } }, _count: { _all: true } }),
  ]);
  const count = (rows: Array<{ projectTeamId: string; _count: { _all: number } }>, teamId: string) => rows.find((row) => row.projectTeamId === teamId)?._count._all ?? 0;
  return new Map(teamIds.map((teamId) => [teamId, { rubrics: count(rubrics, teamId), scored: count(scored, teamId), feedback: count(feedback, teamId) }]));
}

export default async function AdvisorAssignmentsPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");

  const projects = await listAssignedProjects(prisma, actor.id);
  const progress = await reviewProgress(actor.id, projects.flatMap(({ team }) => team ? [team.id] : []));
  const unscored = projects.filter(({ team }) => {
    const row = team ? progress.get(team.id) : undefined;
    return row ? row.scored < row.rubrics : false;
  }).length;
  const anyRubric = [...progress.values()].some(({ rubrics }) => rubrics > 0);
  const finding = !projects.length ? undefined : unscored
    ? <b className="font-semibold"><UiText>{`채점이 남은 프로젝트가 ${unscored}개 있습니다.`}</UiText></b>
    : anyRubric ? <UiText>{"배정된 채점표를 모두 저장했습니다."}</UiText> : <UiText>{"아직 배정된 채점표가 없습니다."}</UiText>;

  return (
    <ExplorerLayout>
      <div className="@container grid gap-3.5">
        <header>
          <h1 className="text-2xl font-bold leading-[1.875rem] text-[var(--ink)]"><UiText>{"담당 프로젝트"}</UiText></h1>
          {finding ? <p className="mt-1.5 text-sm text-[var(--ink)]">{finding}</p> : null}
        </header>

        <section aria-labelledby="advisor-assignments-title" className={`${cardClass} @container`}>
          <CardHead id="advisor-assignments-title" title={<UiText>{"배정된 프로젝트"}</UiText>} count={<>{projects.length}<UiText>{"개"}</UiText></>} />
          {projects.length === 0 ? (
            <div role="status" className="border-t border-[var(--line)] px-5 py-4 text-[0.8125rem]">
              <h3 className="font-medium text-[var(--ink)]"><UiText>{"할당된 프로젝트가 없습니다"}</UiText></h3>
              <p className="mt-0.5 text-[var(--muted)]"><UiText>{"관리자가 담당 프로젝트를 배정하면 이곳에 표시됩니다."}</UiText></p>
            </div>
          ) : (
            <>
              <div aria-hidden="true" className={`hidden h-9 items-center gap-x-4 px-5 text-xs text-[var(--muted)] @min-[44rem]:grid ${rowGrid}`}>
                <span><UiText>{"프로젝트"}</UiText></span>
                <span><UiText>{"팀"}</UiText></span>
                <span className="text-right"><UiText>{"채점"}</UiText></span>
                <span className="text-right"><UiText>{"피드백"}</UiText></span>
                <span />
              </div>
              <ul>
                {projects.map((topic) => {
                  const row = topic.team ? progress.get(topic.team.id) : undefined;
                  const toScore = row ? row.scored < row.rubrics : false;
                  return (
                    <li key={topic.id} className={`group relative grid grid-cols-1 gap-x-4 gap-y-1.5 border-t border-[var(--line)] px-5 py-3 transition-colors hover:bg-[#fafbfc] @min-[44rem]:items-center ${rowGrid}`}>
                      {/* 줄 전체가 상세로 가는 손잡이다. 줄 안에 다른 버튼이 없어 겹치지 않는다. */}
                      <Link href={`/advisor/${topic.id}`} aria-labelledby={`advisor-topic-${topic.id}`} className="absolute inset-0 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--primary)]" />
                      <div className="min-w-0">
                        <h3 id={`advisor-topic-${topic.id}`} className="truncate text-sm font-medium leading-5 text-[var(--ink)] group-hover:text-[var(--primary)] [overflow-wrap:anywhere]"><UiText>{topic.title}</UiText></h3>
                        <p className="mt-0.5 truncate text-xs text-[var(--muted)]"><UiText>{topic.program.name}</UiText></p>
                      </div>
                      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 text-[0.8125rem] @min-[44rem]:contents">
                        <div className="flex min-w-0 items-center gap-2">
                          {topic.team ? <span className="truncate text-[var(--ink)]"><UiText>{topic.team.name}</UiText></span> : null}
                          <Pill>{topic.team ? topic.team.confirmedAt ? "팀 확정" : "팀 구성 중" : "팀 미구성"}</Pill>
                        </div>
                        {/* 값이 없는 칸은 넓은 표에서만 회색 줄표로 남기고, 좁은 줄에서는 칸째 뺀다. */}
                        {row && row.rubrics ? (
                          <span className="whitespace-nowrap tabular-nums @min-[44rem]:text-right">
                            <span className="text-[var(--muted)] @min-[44rem]:hidden"><UiText>{"채점"}</UiText> </span>
                            <span className={toScore ? "font-medium text-[var(--ink)]" : "text-[var(--muted)]"}>{row.scored} / {row.rubrics}</span>
                          </span>
                        ) : <span className="hidden text-right @min-[44rem]:block"><Missing /></span>}
                        {row ? (
                          <span className="whitespace-nowrap tabular-nums @min-[44rem]:text-right">
                            <span className="text-[var(--muted)] @min-[44rem]:hidden"><UiText>{"피드백"}</UiText> </span>
                            <span className="text-[var(--ink)]">{row.feedback}<UiText>{"건"}</UiText></span>
                          </span>
                        ) : <span className="hidden text-right @min-[44rem]:block"><Missing /></span>}
                        <span aria-hidden="true" className="ml-auto whitespace-nowrap font-medium text-[var(--primary)] @min-[44rem]:ml-0 @min-[44rem]:justify-self-end">
                          <UiText>{toScore ? "채점" : "열기"}</UiText>
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </section>
      </div>
    </ExplorerLayout>
  );
}
