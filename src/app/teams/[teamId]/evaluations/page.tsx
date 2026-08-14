import type { Metadata } from "next";

import { EvaluationScoreForm } from "@/app/teams/[teamId]/_components/evaluation-score-form";
import { WorkspacePageHeader } from "@/app/teams/[teamId]/_components/workspace-page-header";
import { loadTeamWorkspace } from "@/app/teams/[teamId]/_lib/team-workspace-data";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { canTeamMemberViewEvaluation, isEvaluationComplete } from "@/modules/rubric/domain/rubric-policy";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { EmptyState, StatusBadge } from "@/shared/ui/page-primitives";
import { renderMarkdown } from "@/shared/ui/render-markdown";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("프로젝트 평가");
}

function statusOf(input: { legacy: boolean; legacyMemberVisible: boolean | null; audience: "STAFF_ONLY" | "TEAM_MEMBERS"; complete: boolean; dueAt: Date }, now: Date) {
  if (input.legacy) return input.legacyMemberVisible ? { label: "팀원 공개", tone: "success" as const } : { label: "관계자 전용", tone: "neutral" as const };
  if (input.audience === "STAFF_ONLY") return { label: "관계자 전용", tone: "neutral" as const };
  if (!input.complete) return { label: "채점 중", tone: "info" as const };
  if (now < input.dueAt) return { label: "마감 후 공개 예정", tone: "warning" as const };
  return { label: "팀원 공개", tone: "success" as const };
}

export default async function TeamEvaluationsPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const { actor, workspace } = await loadTeamWorkspace(teamId);
  const now = new Date();
  const isStaff = workspace.access.canSupervise || actor.role === "ADMIN";
  const records = await prisma.teamRubricEvaluation.findMany({
    where: { teamId },
    orderBy: [{ rubric: { position: "asc" } }, { createdAt: "asc" }],
    select: {
      id: true,
      legacyMemberVisible: true,
      rubric: { select: { title: true, gradingDueAt: true, audience: true, archivedAt: true, legacy: true, criteria: { orderBy: { position: "asc" }, select: { id: true, label: true, maxPoints: true } } } },
      scores: { select: { criterionId: true, points: true, scoredByName: true, updatedAt: true } },
    },
  });
  const advisorFeedback = await prisma.advisorFeedback.findMany({
    where: { teamId },
    orderBy: { createdAt: "asc" },
    select: { id: true, body: true, createdAt: true, advisor: { select: { name: true } } },
  });
  const advisorEvaluations = isStaff
    ? await prisma.advisorEvaluation.findMany({
        where: { teamId },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          advisor: { select: { name: true } },
          rubric: { select: { title: true, criteria: { select: { maxPoints: true } } } },
          scores: { select: { points: true } },
        },
      })
    : [];
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

  return (
    <section aria-labelledby="evaluations-title" className="mx-auto max-w-5xl space-y-7">
      <WorkspacePageHeader title="평가" titleId="evaluations-title" description="보고서와 별개로 프로젝트 팀에 할당된 채점표와 평가 결과를 확인합니다." bordered={false} />
      {evaluations.length === 0 ? (
        <EmptyState title={isStaff ? "할당된 채점표가 없습니다" : "공개된 평가가 없습니다"} description={isStaff ? "프로그램 채점표 설정을 확인해 주세요." : "팀원 공개 대상 평가가 완료되고 마감되면 이곳에 표시됩니다."} />
      ) : (
        <div className="grid gap-4">
          {evaluations.map((evaluation) => {
            const status = statusOf({ legacy: evaluation.rubric.legacy, legacyMemberVisible: evaluation.legacyMemberVisible, audience: evaluation.rubric.audience, complete: evaluation.complete, dueAt: evaluation.rubric.gradingDueAt }, now);
            const total = evaluation.criteria.reduce((sum, criterion) => sum + (criterion.points ?? 0), 0);
            const maximum = evaluation.criteria.reduce((sum, criterion) => sum + criterion.maxPoints, 0);
            const scorable = isStaff && !evaluation.rubric.legacy && !evaluation.rubric.archivedAt && workspace.status !== "FORMING" && now <= evaluation.rubric.gradingDueAt;
            return (
              <article key={evaluation.id} className="rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm sm:p-6">
                <header className="flex flex-wrap items-start justify-between gap-3">
                  <div><h2 className="text-xl font-bold tracking-[-0.03em]"><UiText>{evaluation.rubric.title}</UiText></h2><p className="mt-1 text-sm text-[var(--muted)]"><UiText>{"채점 마감"}</UiText>{" "}<UiDate value={evaluation.rubric.gradingDueAt} mode="dateTime" /></p></div>
                  <div className="flex items-center gap-2"><StatusBadge tone={status.tone}><UiText>{status.label}</UiText></StatusBadge>{evaluation.complete ? <strong className="text-lg">{total} / {maximum}</strong> : null}</div>
                </header>
                {scorable ? <EvaluationScoreForm evaluationId={evaluation.id} teamId={teamId} criteria={evaluation.criteria} /> : (
                  <dl className="mt-5 grid gap-2 border-t border-[var(--line)] pt-5">
                    {evaluation.criteria.map((criterion) => <div key={criterion.id} className="flex items-center justify-between gap-3 text-sm"><dt className="font-semibold">{criterion.label}</dt><dd>{criterion.points === null ? "미채점" : `${criterion.points} / ${criterion.maxPoints}`}</dd></div>)}
                  </dl>
                )}
              </article>
            );
          })}
        </div>
      )}

      <section aria-labelledby="advisor-feedback-title" className="space-y-3">
        <h2 id="advisor-feedback-title" className="text-xl font-bold tracking-[-0.03em]"><UiText>{"자문위원 피드백"}</UiText></h2>
        {advisorFeedback.length === 0 ? (
          <EmptyState title="자문위원 피드백이 없습니다" description="담당 자문위원이 피드백을 남기면 이곳에 표시됩니다." />
        ) : (
          <ul className="grid gap-4">
            {advisorFeedback.map((entry) => (
              <li key={entry.id} className="rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface)] p-5">
                <p className="text-sm font-bold"><UiText>{entry.advisor.name}</UiText><span className="muted ml-2 text-xs font-medium"><UiDate value={entry.createdAt} mode="dateTime" /></span></p>
                <div className="mt-2 space-y-3 text-[0.9375rem] text-[var(--ink)]">{renderMarkdown(entry.body)}</div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {isStaff ? (
        <section aria-labelledby="advisor-scores-title" className="space-y-3">
          <h2 id="advisor-scores-title" className="text-xl font-bold tracking-[-0.03em]"><UiText>{"자문위원 점수"}</UiText></h2>
          {advisorEvaluations.length === 0 ? (
            <EmptyState title="자문위원 채점이 없습니다" description="담당 자문위원이 채점을 저장하면 이곳에 표시됩니다." />
          ) : (
            <ul className="divide-y divide-[var(--line)] rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface)]">
              {advisorEvaluations.map((evaluation) => (
                <li key={evaluation.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div><p className="text-sm font-bold"><UiText>{evaluation.advisor.name}</UiText></p><p className="muted text-xs"><UiText>{evaluation.rubric.title}</UiText></p></div>
                  <strong className="text-lg">
                    {evaluation.scores.reduce((sum, score) => sum + score.points, 0)} / {evaluation.rubric.criteria.reduce((sum, criterion) => sum + criterion.maxPoints, 0)}
                  </strong>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </section>
  );
}
