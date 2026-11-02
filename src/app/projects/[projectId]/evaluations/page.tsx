import type { Metadata } from "next";

import { EvaluationScoreForm } from "@/app/projects/[projectId]/_components/evaluation-score-form";
import { monthDay, WorkspacePageHeader } from "@/app/projects/[projectId]/_components/workspace-page-header";
import { cardClass, CardHead, daysLabel, daysUntil, Pill, type PillTone } from "@/modules/project-program/ui/work-screen";
import { loadActiveTeamWorkspace } from "@/app/projects/[projectId]/_lib/team-workspace-data";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { canTeamMemberViewEvaluation, isEvaluationComplete } from "@/modules/rubric/domain/rubric-policy";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";
import { LocalizedMarkdown } from "@/modules/translation/ui/localized-markdown";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { EmptyState } from "@/shared/ui/page-primitives";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("프로젝트 평가");
}

function statusOf(input: { legacy: boolean; legacyMemberVisible: boolean | null; audience: "STAFF_ONLY" | "TEAM_MEMBERS"; complete: boolean; dueAt: Date }, now: Date): { label: string; tone: PillTone } {
  if (input.legacy) return input.legacyMemberVisible ? { label: "팀원 공개", tone: "success" } : { label: "관계자 전용", tone: "plain" };
  if (input.audience === "STAFF_ONLY") return { label: "관계자 전용", tone: "plain" };
  if (!input.complete) return { label: "채점 중", tone: "accent" };
  if (now < input.dueAt) return { label: "마감 후 공개 예정", tone: "warning" };
  return { label: "팀원 공개", tone: "success" };
}

export default async function TeamEvaluationsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { actor, workspace } = await loadActiveTeamWorkspace(projectId);
  const now = new Date();
  const isStaff = workspace.access.canSupervise || actor.role === "ADMIN";
  const records = await prisma.projectTeamRubricEvaluation.findMany({
    where: { projectTeamId: workspace.id },
    orderBy: [{ rubric: { position: "asc" } }, { createdAt: "asc" }],
    select: {
      id: true,
      legacyMemberVisible: true,
      rubric: { select: { title: true, gradingDueAt: true, audience: true, archivedAt: true, legacy: true, criteria: { orderBy: { position: "asc" }, select: { id: true, label: true, maxPoints: true } } } },
      scores: { select: { criterionId: true, points: true, scoredByName: true, updatedAt: true } },
    },
  });
  const [advisorFeedback, advisorEvaluations] = await Promise.all([
    prisma.advisorFeedback.findMany({
      where: { projectTeamId: workspace.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, body: true, createdAt: true, advisor: { select: { name: true } } },
    }),
    isStaff ? prisma.advisorEvaluation.findMany({
      where: { projectTeamId: workspace.id },
      select: { id: true, advisor: { select: { name: true } }, scores: { select: { points: true } } },
    }) : Promise.resolve([]),
  ]);
  const evaluations = records.map((record) => {
    const points = new Map(record.scores.map((score) => [score.criterionId, score.points]));
    const criteria = record.rubric.criteria.map((criterion) => ({ ...criterion, points: points.get(criterion.id) ?? null }));
    const criterionIds = criteria.map((criterion) => criterion.id);
    const scoredCriterionIds = record.scores.map((score) => score.criterionId);
    const complete = isEvaluationComplete(criterionIds, scoredCriterionIds);
    const visibleToMember = canTeamMemberViewEvaluation({
      audience: record.rubric.audience,
      gradingDueAt: record.rubric.gradingDueAt,
      criterionIds,
      scoredCriterionIds,
      legacy: record.rubric.legacy,
      legacyMemberVisible: record.legacyMemberVisible,
    }, now);
    return { ...record, criteria, complete, visibleToMember };
  }).filter((evaluation) => isStaff || evaluation.visibleToMember);

  const rows = evaluations.map((evaluation) => ({
    ...evaluation,
    status: statusOf({ legacy: evaluation.rubric.legacy, legacyMemberVisible: evaluation.legacyMemberVisible, audience: evaluation.rubric.audience, complete: evaluation.complete, dueAt: evaluation.rubric.gradingDueAt }, now),
    total: evaluation.criteria.reduce((sum, criterion) => sum + (criterion.points ?? 0), 0),
    maximum: evaluation.criteria.reduce((sum, criterion) => sum + criterion.maxPoints, 0),
    scorable: isStaff && !evaluation.rubric.legacy && !evaluation.rubric.archivedAt && workspace.status !== "FORMING" && now <= evaluation.rubric.gradingDueAt,
  }));

  // 제목 밑 한 줄: 채점하는 쪽은 남은 채점과 가장 가까운 마감, 팀원은 공개된 총점.
  const unscored = rows.filter((row) => row.scorable && !row.complete).sort((left, right) => left.rubric.gradingDueAt.getTime() - right.rubric.gradingDueAt.getTime());
  const released = rows.filter((row) => row.complete);
  const finding = isStaff
    ? unscored.length
      ? <><b className="font-semibold"><UiText>{`채점이 남은 평가표가 ${unscored.length}개입니다.`}</UiText></b>{" "}<UiText>{`${unscored[0].rubric.title} 채점 마감은 ${monthDay.format(unscored[0].rubric.gradingDueAt)}(${daysLabel(daysUntil(unscored[0].rubric.gradingDueAt, now))})입니다.`}</UiText></>
      : rows.length ? <UiText>{`평가표 ${rows.length}개의 채점이 모두 끝났습니다.`}</UiText> : null
    : released.length
      ? <>{released.map((row) => <UiText key={row.id}>{`${row.rubric.title} 총점은 ${row.total} / ${row.maximum}점입니다.`}</UiText>).flatMap((node, index) => index ? [" ", node] : [node])}</>
      : advisorFeedback.length ? <UiText>{`자문위원 피드백 ${advisorFeedback.length}건이 있습니다.`}</UiText> : null;
  const hasSide = advisorFeedback.length > 0 || (isStaff && advisorEvaluations.length > 0);

  return (
    <section aria-labelledby="evaluations-title" className="@container mx-auto grid max-w-6xl gap-5">
      <WorkspacePageHeader title="평가" titleId="evaluations-title" finding={finding} />
      <div className={`grid items-start gap-3.5 ${hasSide ? "@min-[60rem]:grid-cols-[minmax(0,1fr)_20rem]" : ""}`}>
        <div className="grid min-w-0 gap-3.5">
          {rows.length === 0 ? (
            <div className={cardClass}>
              <EmptyState variant="section" title={isStaff ? "할당된 채점표가 없습니다" : "공개된 평가가 없습니다"} description={isStaff ? "프로그램 채점표 설정을 확인해 주세요." : "팀원 공개 대상 평가가 완료되고 마감되면 이곳에 표시됩니다."} />
            </div>
          ) : rows.map((row) => (
            <article key={row.id} aria-labelledby={`rubric-title-${row.id}`} className={cardClass}>
              <div className="flex flex-wrap items-start gap-x-4 gap-y-2 px-5 pb-3 pt-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 id={`rubric-title-${row.id}`} className="text-base font-semibold leading-[1.375rem] text-[var(--ink)]"><UiText>{row.rubric.title}</UiText></h2>
                    <Pill tone={row.status.tone}>{row.status.label}</Pill>
                  </div>
                  <p className="mt-0.5 text-[0.8125rem] tabular-nums text-[var(--muted)]"><UiText>{"채점 마감"}</UiText>{" "}<UiDate value={row.rubric.gradingDueAt} mode="dateTime" /></p>
                </div>
                {/* 총점이 이 칸의 답이다. 다 채점되기 전에는 합을 내지 않는다. */}
                <p className="text-2xl font-medium leading-[1.875rem] tabular-nums text-[var(--ink)]">
                  {row.complete ? row.total : <span className="text-base text-[var(--muted)]">-</span>}
                  <small className="ml-0.5 text-sm font-normal text-[var(--muted)]"> / {row.maximum}<UiText>{"점"}</UiText></small>
                </p>
              </div>
              {row.scorable ? <EvaluationScoreForm evaluationId={row.id} teamId={workspace.id} criteria={row.criteria} /> : (
                <dl className="text-[0.8125rem]">
                  {row.criteria.map((criterion) => (
                    <div key={criterion.id} className="flex min-h-10 items-center justify-between gap-3 border-t border-[var(--line)] px-5">
                      <dt className="text-[var(--ink)]"><UiText>{criterion.label}</UiText></dt>
                      <dd className="tabular-nums">
                        {criterion.points === null
                          ? <span className="text-[var(--muted)]"><UiText>{"미채점"}</UiText></span>
                          : <><span className="text-[var(--ink)]">{criterion.points}</span><span className="text-[var(--muted)]"> / {criterion.maxPoints}</span></>}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </article>
          ))}
        </div>

        {hasSide ? (
          <div className="grid min-w-0 gap-3.5">
            {advisorFeedback.length ? (
              <section aria-labelledby="advisor-feedback-title" className={cardClass}>
                <CardHead id="advisor-feedback-title" title={<UiText>{"자문위원 피드백"}</UiText>} count={<>{advisorFeedback.length}<UiText>{"건"}</UiText></>} />
                <ul>
                  {advisorFeedback.map((feedback) => (
                    <li key={feedback.id} className="border-t border-[var(--line)] px-5 py-3">
                      <p className="text-[0.8125rem] font-medium text-[var(--ink)]"><UiText>{feedback.advisor.name}</UiText> <span className="ml-1 text-xs font-normal tabular-nums text-[var(--muted)]"><UiDate value={feedback.createdAt} mode="dateTime" /></span></p>
                      <LocalizedMarkdown text={feedback.body} className="mt-1.5 text-[0.8125rem] leading-5" />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {isStaff && advisorEvaluations.length ? (
              <section aria-labelledby="advisor-scores-title" className={cardClass}>
                <CardHead id="advisor-scores-title" title={<UiText>{"자문위원 점수"}</UiText>} count={<UiText>{"채점 총점"}</UiText>} />
                <ul className="text-[0.8125rem]">
                  {advisorEvaluations.map((evaluation) => (
                    <li key={evaluation.id} className="flex min-h-10 items-center justify-between gap-3 border-t border-[var(--line)] px-5">
                      <span className="min-w-0 truncate text-[var(--ink)]"><UiText>{evaluation.advisor.name}</UiText></span>
                      <span className="font-medium tabular-nums text-[var(--ink)]">{evaluation.scores.reduce((sum, score) => sum + score.points, 0)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
