import { UiDate } from "@/modules/translation/ui/i18n-provider";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiAside } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { loadTeamReportWorkspace } from "@/app/teams/[teamId]/_lib/team-workspace-data";
import { ReportDecisionForm } from "@/app/teams/[teamId]/_components/report-decision-form";
import { RemoveReportRequirementForm, ReportRequirementForm } from "@/app/teams/[teamId]/_components/report-requirement-forms";
import { ReportSubmissionForm } from "@/app/teams/[teamId]/_components/report-submission-form";
import { MobileFieldLabel, WorkspacePageHeader } from "@/app/teams/[teamId]/_components/workspace-page-header";
import { EmptyState, StatusBadge } from "@/shared/ui/page-primitives";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("프로젝트 보고서");
}
const reportTypeLabel = { START: "착수 보고서", MIDTERM: "중간 보고서", FINAL: "결과 보고서" } as const;

function ReportStatusStrip({ title, description }: { title: string; description: string }) {
  return (
    <aside role="status" className="flex flex-col gap-1 border-y border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
      <strong className="shrink-0 text-sm text-[var(--ink)]"><UiText>{title}</UiText></strong>
      <p className="text-sm leading-6 text-[var(--muted)]"><UiText>{description}</UiText></p>
    </aside>
  );
}

function ReportReviewFeedback({
  versionId,
  decision,
  showRevisionGuidance,
  canResubmit,
  revisionAction,
}: {
  versionId: string;
  decision: {
    decision: "APPROVED" | "REVISION_REQUESTED";
    comment: string;
    decidedAt: Date;
    reviewerName: string;
  };
  showRevisionGuidance: boolean;
  canResubmit: boolean;
  revisionAction?: ReactNode;
}) {
  const revisionRequested = decision.decision === "REVISION_REQUESTED";
  const title = revisionRequested ? "수정 요청 사항" : "승인 의견";
  return (
    <aside
      aria-labelledby={`report-feedback-title-${versionId}`}
      className={`mt-4 rounded-[var(--radius-control)] border px-4 py-4 ${
        revisionRequested
          ? "border-[var(--warning)] bg-[var(--warning-subtle)]"
          : "border-[var(--success)] bg-[var(--success-subtle)]"
      }`}
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <h3 id={`report-feedback-title-${versionId}`} className="text-sm font-extrabold text-[var(--ink)]">
          <UiText>{title}</UiText>
        </h3>
        <p className="text-xs leading-5 text-[var(--muted)]">
          <span className="font-semibold text-[var(--ink)]">{decision.reviewerName}</span>
          <span aria-hidden="true"> · </span>
          <time dateTime={decision.decidedAt.toISOString()}>
            <UiDate value={decision.decidedAt} mode="dateTime" />
          </time>
        </p>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[var(--ink)]">
        <UiText>{decision.comment || "등록된 검토 의견이 없습니다."}</UiText>
      </p>
      {revisionRequested && showRevisionGuidance ? (
        <div className="mt-3 flex flex-col gap-3 border-t border-[var(--warning)] pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold leading-6 text-[var(--warning-ink)]">
            <UiText>{canResubmit
              ? "요청 사항을 반영한 새 버전을 제출해 주세요."
              : "제출 기한이 지났습니다. 새 버전 제출 일정은 지도교수에게 확인해 주세요."}</UiText>
          </p>
          {canResubmit && revisionAction ? <div className="shrink-0">{revisionAction}</div> : null}
        </div>
      ) : null}
    </aside>
  );
}

export default async function TeamReportsPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const { workspace, reportWorkspace } = await loadTeamReportWorkspace(teamId);
  const now = new Date();
  const submittableReports = reportWorkspace.reports.filter((report) => report.dueAt >= now).map(({ type, dueAt }) => ({ type, dueAt }));
  const canManageRequirements = workspace.status !== "CLOSED" && workspace.access.canSupervise;
  const canSubmit = workspace.status === "CONFIRMED" && workspace.access.canContribute && submittableReports.length > 0;
  const earliestDueAt = workspace.schedule.executionStartsAt > now ? workspace.schedule.executionStartsAt : now;
  const nextReport = [...reportWorkspace.reports]
    .filter((report) => report.dueAt >= now && report.versions[0]?.decision?.decision !== "APPROVED")
    .sort((left, right) => left.dueAt.getTime() - right.dueAt.getTime())[0];
  const hasNoSubmittableReports = workspace.status === "CONFIRMED"
    && workspace.access.canContribute
    && reportWorkspace.reports.length > 0
    && submittableReports.length === 0;
  const emptyDescription = workspace.status === "CLOSED"
    ? "프로젝트 종료 전에 설정된 보고서 일정이 없습니다."
    : workspace.access.canContribute
      ? workspace.advisorEnabled ? "지도교수가 보고서 종류와 마감을 정하면 여기에서 시작할 수 있습니다." : "프로젝트 관리자가 보고서 종류와 마감을 정하면 여기에서 시작할 수 있습니다."
      : "첫 보고서 종류와 마감을 정해 주세요.";

  return (
    <section aria-labelledby="reports-title" className="space-y-8">
      <WorkspacePageHeader
        eyebrow="프로젝트 문서"
        title="보고서"
        titleId="reports-title"
        description="제출 일정과 버전별 피드백, 승인 상태를 확인합니다."
        actions={canManageRequirements || canSubmit ? <>{canManageRequirements ? <ReportRequirementForm teamId={workspace.id} executionStartsAt={earliestDueAt} submissionEndsAt={workspace.schedule.submissionEndsAt} /> : null}{canSubmit ? <ReportSubmissionForm teamId={workspace.id} requirements={submittableReports} /> : null}</> : undefined}
      />

      {nextReport ? <UiAside aria-label="다음 보고서 기한" className="grid gap-2 border-b border-[var(--line)] pb-6 sm:grid-cols-[9rem_minmax(0,1fr)_auto] sm:items-center"><p className="text-xs font-extrabold text-[var(--accent-ink)]"><UiText>{"다음 마감"}</UiText></p><strong className="text-lg">{reportTypeLabel[nextReport.type]}</strong><time className="font-bold text-[var(--accent-ink)]" dateTime={nextReport.dueAt.toISOString()}><UiDate value={nextReport.dueAt} mode="dateTime" /></time></UiAside> : null}

      {hasNoSubmittableReports ? <ReportStatusStrip title="현재 제출 가능한 보고서가 없습니다" description="기존 제출·검토 이력은 아래에서 확인할 수 있습니다." /> : null}
      {workspace.status === "FORMING" ? <ReportStatusStrip title="팀 확정 후 제출할 수 있습니다" description={workspace.advisorEnabled ? "지도교수가 팀을 확정하면 제출 기간 내 보고서 버전을 등록할 수 있습니다." : "프로젝트 관리자가 팀을 확정하면 제출 기간 내 보고서 버전을 등록할 수 있습니다."} /> : workspace.status === "CLOSED" ? <ReportStatusStrip title="종료된 프로젝트입니다" description="새 보고서를 제출할 수 없으며 기존 제출·승인 이력만 확인할 수 있습니다." /> : null}
      {reportWorkspace.reports.length === 0 ? <EmptyState title="보고서 일정이 없습니다" description={emptyDescription} /> : (
        <div>
          <div className="hidden grid-cols-[9rem_minmax(0,1fr)_9rem_7rem] border-b border-[var(--line-strong)] px-2 pb-3 text-xs font-bold text-[var(--muted)] md:grid"><span><UiText>{"보고서"}</UiText></span><span><UiText>{"제출 이력"}</UiText></span><span><UiText>{"마감 기한"}</UiText></span><span className="text-right"><UiText>{"관리"}</UiText></span></div>
          <div className="divide-y divide-[var(--line)] border-b border-[var(--line)]">
            {reportWorkspace.reports.map((report) => (
              <article key={report.type} className="grid gap-5 px-2 py-6 md:grid-cols-[9rem_minmax(0,1fr)_9rem_7rem]">
                <div><MobileFieldLabel><UiText>{"보고서"}</UiText></MobileFieldLabel><h2 className="font-extrabold">{reportTypeLabel[report.type]}</h2><p className="muted mt-1 text-xs">{report.versions.length}<UiText>{"개 버전"}</UiText></p></div>
                <div>
                  <MobileFieldLabel><UiText>{"제출 이력"}</UiText></MobileFieldLabel>
                  {!report.versions.length ? <p className="muted text-sm"><UiText>{"아직 제출된 버전이 없습니다."}</UiText></p> : (
                    <ol className="relative border-l border-[var(--line)] pl-5">
                      {report.versions.map((version, index) => (
                        <li key={version.id} className="relative border-b border-[var(--line)] py-4 first:pt-0 last:border-b-0 last:pb-0">
                          <span aria-hidden="true" className={`absolute -left-[1.45rem] size-2 rounded-full bg-[var(--primary)] ${index === 0 ? "top-1" : "top-5"}`} />
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="min-w-0"><a href={`/api/files/${version.fileId}`} className="font-semibold text-[var(--primary-hover)] underline-offset-4 [overflow-wrap:anywhere] hover:underline">v{version.version} · {version.fileName}</a><p className="muted mt-1 text-xs">{version.submitterName} · <UiDate value={version.submittedAt} mode="date" /></p></div>
                            {version.decision ? <StatusBadge tone={version.decision.decision === "APPROVED" ? "success" : "warning"}><UiText>{version.decision.decision === "APPROVED" ? "승인" : "수정 요청"}</UiText></StatusBadge> : <StatusBadge tone="neutral"><UiText>{index === 0 ? "검토 대기" : "이전 버전"}</UiText></StatusBadge>}
                          </div>
                          {version.description ? <p className="mt-2 text-sm leading-6"><UiText>{version.description}</UiText></p> : null}
                          {version.decision ? (
                            <ReportReviewFeedback
                              versionId={version.id}
                              decision={version.decision}
                              showRevisionGuidance={workspace.access.isTeamMember && index === 0}
                              canResubmit={workspace.status === "CONFIRMED" && report.dueAt >= now}
                              revisionAction={workspace.access.isTeamMember && index === 0 ? (
                                <ReportSubmissionForm
                                  teamId={workspace.id}
                                  requirements={[{ type: report.type, dueAt: report.dueAt }]}
                                  triggerLabel="수정본 제출"
                                  triggerClassName="button-secondary"
                                />
                              ) : undefined}
                            />
                          ) : workspace.status === "CONFIRMED" && workspace.access.canSupervise && index === 0 ? (
                            <ReportDecisionForm teamId={workspace.id} reportVersionId={version.id} />
                          ) : null}
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
                <div><MobileFieldLabel><UiText>{"마감 기한"}</UiText></MobileFieldLabel><time className="text-sm font-semibold" dateTime={report.dueAt.toISOString()}><UiDate value={report.dueAt} mode="date" /></time></div>
                <div className="md:justify-self-end">{canManageRequirements ? <><MobileFieldLabel><UiText>{"관리"}</UiText></MobileFieldLabel><RemoveReportRequirementForm teamId={workspace.id} type={report.type} disabled={report.versions.length > 0} /></> : null}</div>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
