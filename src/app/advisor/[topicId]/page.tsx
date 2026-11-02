import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { AdvisorFeedbackForm } from "@/app/advisor/_components/advisor-feedback-form";
import { AdvisorScoringForm } from "@/app/advisor/_components/advisor-scoring-form";
import { findAdvisorReview, findAssignedProject } from "@/modules/advisor/infrastructure/prisma-advisor-workspace-query";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { cardClass, CardHead, daysUntil, ObjectHeader, Pill } from "@/modules/project-program/ui/work-screen";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";
import { LocalizedMarkdown } from "@/modules/translation/ui/localized-markdown";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { ARTIFACT_TYPE_LABELS, ArtifactMedia, type ArtifactType } from "@/shared/ui/artifact-media";
import { ExplorerLayout } from "@/shared/ui/explorer-layout";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("담당 프로젝트 상세");
}

export default async function AdvisorProjectDetailPage({ params }: { params: Promise<{ topicId: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const { topicId } = await params;
  const topic = await findAssignedProject(prisma, actor.id, topicId);
  if (!topic) notFound();
  const review = topic.team ? await findAdvisorReview(prisma, actor.id, topic.team.id) : null;
  const now = new Date();
  const rubrics = review?.rubrics ?? [];
  // 한 번이라도 저장한 채점표는 항목마다 점수가 들어 있다(빈 칸은 저장되지 않는다).
  const savedCount = rubrics.filter(({ criteria }) => criteria.some(({ points }) => points !== null)).length;
  const nextDue = rubrics.map(({ gradingDueAt }) => gradingDueAt).filter((due) => due >= now).sort((a, b) => a.getTime() - b.getTime())[0];
  const dueDays = nextDue ? daysUntil(nextDue, now) : null;
  const programEnded = now > topic.program.endsAt;
  const finding = rubrics.length ? (
    <>
      <b className="font-semibold"><UiText>{savedCount === rubrics.length ? `채점표 ${rubrics.length}개를 모두 저장했습니다.` : `채점표 ${rubrics.length}개 중 ${savedCount}개를 저장했습니다.`}</UiText></b>
      {dueDays !== null ? <>{" "}<UiText>{dueDays === 0 ? "채점 마감이 오늘입니다." : `채점 마감까지 ${dueDays}일 남았습니다.`}</UiText></> : null}
    </>
  ) : programEnded ? <UiText>{"프로그램이 종료되어 더 이상 작성할 수 없습니다."}</UiText> : undefined;

  return (
    <ExplorerLayout>
      <div className="@container grid gap-3.5">
        <ObjectHeader
          id="advisor-project-title"
          title={<UiText>{topic.title}</UiText>}
          titleAside={topic.team ? undefined : <Pill>{"팀 미구성"}</Pill>}
          meta={<><UiText>{topic.program.name}</UiText>{topic.team ? <>, <UiText>{topic.team.name}</UiText></> : null}</>}
          finding={finding}
        />

        {!topic.team ? (
          <section aria-labelledby="advisor-project-empty" className={`${cardClass} px-5 py-4 text-[0.8125rem]`}>
            <h2 id="advisor-project-empty" className="font-medium text-[var(--ink)]"><UiText>{"팀이 아직 구성되지 않았습니다"}</UiText></h2>
          </section>
        ) : (
          // 넓으면 왼쪽에 볼 것(소개, 결과물, 보고서), 오른쪽에 할 것(채점, 피드백).
          <div className="grid items-start gap-3.5 @min-[64rem]:grid-cols-[minmax(0,1fr)_24rem]">
            <div className="grid min-w-0 gap-3.5">
              <section aria-labelledby="advisor-project-intro" className={cardClass}>
                <CardHead id="advisor-project-intro" title={<UiText>{"프로젝트 소개"}</UiText>} />
                <LocalizedMarkdown text={topic.team.showcaseIntro ?? topic.description} className="space-y-3 px-5 pb-5 text-[0.9375rem] leading-7 text-[var(--ink)]" />
              </section>

              <section aria-labelledby="advisor-project-artifacts" className={cardClass}>
                <CardHead id="advisor-project-artifacts" title={<UiText>{"결과물"}</UiText>} count={<>{topic.team.artifacts.length}<UiText>{"개"}</UiText></>} />
                {topic.team.artifacts.length === 0 ? (
                  <p className="px-5 pb-4 text-[0.8125rem] text-[var(--muted)]"><UiText>{"등록된 결과물이 없습니다."}</UiText></p>
                ) : (
                  <ul className="px-5 pb-5">
                    {topic.team.artifacts.map((artifact) => (
                      <li key={artifact.id} className="min-w-0 py-4 first:pt-1 [&+li]:border-t [&+li]:border-[var(--line)]">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                          <div className="min-w-0">
                            <h3 className="text-sm font-medium leading-5 text-[var(--ink)] [overflow-wrap:anywhere]"><UiText>{artifact.title}</UiText></h3>
                            <span className="block text-xs text-[var(--muted)]"><UiText>{ARTIFACT_TYPE_LABELS[artifact.type as ArtifactType]}</UiText></span>
                          </div>
                          <time className="shrink-0 text-xs tabular-nums text-[var(--muted)]" dateTime={artifact.createdAt.toISOString()}><UiDate value={artifact.createdAt} mode="date" /></time>
                        </div>
                        <div className="mt-3">
                          <ArtifactMedia type={artifact.type as ArtifactType} title={artifact.title} fileId={artifact.fileId} externalUrl={artifact.externalUrl} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section aria-labelledby="advisor-project-reports" className={cardClass}>
                <CardHead
                  id="advisor-project-reports"
                  title={<UiText>{"보고서"}</UiText>}
                  count={topic.team.reports.length ? <UiText>{`${topic.team.reports.filter(({ versions }) => versions.length).length} / ${topic.team.reports.length}건 제출`}</UiText> : undefined}
                />
                {topic.team.reports.length === 0 ? (
                  <p className="px-5 pb-4 text-[0.8125rem] text-[var(--muted)]"><UiText>{"제출된 보고서가 없습니다."}</UiText></p>
                ) : (
                  <ul>
                    {topic.team.reports.map((report) => {
                      const latest = report.versions[0];
                      return (
                        <li key={report.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-[var(--line)] px-5 py-2.5">
                          <div className="min-w-0 leading-5">
                            <p className="truncate text-sm font-medium text-[var(--ink)]"><UiText>{report.titleSnapshot}</UiText></p>
                            {latest ? (
                              <p className="truncate text-xs tabular-nums text-[var(--muted)]">
                                <UiText>{"버전"}</UiText> {latest.version}, {latest.file.originalName}, <UiDate value={latest.submittedAt} mode="dateTime" />
                              </p>
                            ) : <p className="text-xs text-[var(--muted)]"><UiText>{"제출 전"}</UiText></p>}
                          </div>
                          {latest ? (
                            <a className="button-secondary button-compact font-medium" href={`/api/files/${latest.fileId}`}><UiText>{"파일 받기"}</UiText></a>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </div>

            <div className="grid min-w-0 gap-3.5">
              {rubrics.length ? rubrics.map((rubric) => (
                <AdvisorScoringForm
                  key={rubric.id}
                  topicId={topic.id}
                  rubricId={rubric.id}
                  title={rubric.title}
                  dueAt={rubric.gradingDueAt}
                  criteria={rubric.criteria}
                  readOnly={now > rubric.gradingDueAt}
                />
              )) : (
                <section aria-labelledby="advisor-project-scoring" className={cardClass}>
                  <CardHead id="advisor-project-scoring" title={<UiText>{"채점표"}</UiText>} />
                  <p className="px-5 pb-4 text-[0.8125rem] text-[var(--muted)]"><UiText>{"채점표가 준비되지 않았습니다."}</UiText></p>
                </section>
              )}
              <AdvisorFeedbackForm topicId={topic.id} feedback={review?.feedback ?? []} readOnly={programEnded} />
            </div>
          </div>
        )}
      </div>
    </ExplorerLayout>
  );
}
