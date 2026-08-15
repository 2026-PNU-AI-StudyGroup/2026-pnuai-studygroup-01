import type { Metadata } from "next";

import { ReportDecisionForm } from "@/app/projects/[projectId]/_components/report-decision-form";
import { ReportFeedbackForm } from "@/app/projects/[projectId]/_components/report-score-feedback-forms";
import { ReportSubmissionForm } from "@/app/projects/[projectId]/_components/report-submission-form";
import { WorkspacePageHeader } from "@/app/projects/[projectId]/_components/workspace-page-header";
import {
  isReportSubmissionOpen,
  reportPresentationState,
} from "@/app/projects/[projectId]/_lib/report-page-presentation";
import { loadTeamReportWorkspace } from "@/app/projects/[projectId]/_lib/team-workspace-data";
import type { ReportWorkspace } from "@/modules/report/application/report-ports";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";
import { EmptyState, StatusBadge } from "@/shared/ui/page-primitives";
import { DownloadIcon } from "@/shared/ui/workspace-icons";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("프로젝트 보고서");
}

type ReportItem = ReportWorkspace["reports"][number];

const stateView = {
  UNSUBMITTED: { label: "제출 전", tone: "info" },
  PENDING_REVIEW: { label: "검토 중", tone: "info" },
  REVISION_REQUESTED: { label: "수정 필요", tone: "warning" },
  APPROVED: { label: "승인 완료", tone: "success" },
} as const;

function ReportCard({
  teamId,
  report,
  canSubmit,
  canReview,
  isTeamMember,
  advisorEnabled,
}: {
  teamId: string;
  report: ReportItem;
  canSubmit: boolean;
  canReview: boolean;
  isTeamMember: boolean;
  advisorEnabled: boolean;
}) {
  const state = reportPresentationState(report);
  const presentation = stateView[state];
  const latest = report.versions[0];
  const submission = { id: report.id, title: report.title, dueAt: report.dueAt };

  return (
    <article id={`report-${report.id}`} className="scroll-mt-6 rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-sm sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold tracking-[-0.03em]"><UiText>{report.title}</UiText></h2>
            {!report.submissionEnabled ? <StatusBadge tone="neutral"><UiText>{"보관됨"}</UiText></StatusBadge> : !report.required ? <StatusBadge tone="neutral"><UiText>{"선택 제출"}</UiText></StatusBadge> : <StatusBadge tone="info"><UiText>{"필수 제출"}</UiText></StatusBadge>}
            <StatusBadge tone={presentation.tone}><UiText>{presentation.label}</UiText></StatusBadge>
          </div>
          <p className="mt-1 text-sm text-[var(--muted)]">
            <UiText>{"제출 마감"}</UiText>{" "}
            <time dateTime={report.dueAt.toISOString()}><UiDate value={report.dueAt} mode="dateTime" /></time>
          </p>
        </div>
        {canSubmit && state !== "REVISION_REQUESTED" ? <ReportSubmissionForm teamId={teamId} requirements={[submission]} triggerLabel={latest ? "새 버전 제출" : "보고서 제출"} /> : null}
      </header>

      {report.versions.length ? (
        <ol className="mt-5 grid gap-3">
          {report.versions.map((version, index) => (
            <li key={version.id} className="rounded-2xl bg-[var(--surface-subtle)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <a href={`/api/files/${version.fileId}`} className="font-bold text-[var(--primary-hover)] hover:underline">v{version.version} · {version.fileName}</a>
                  <p className="mt-1 text-xs text-[var(--muted)]">{version.submitterName}{" · "}<UiDate value={version.submittedAt} mode="dateTime" /></p>
                </div>
                {version.decision ? (
                  <StatusBadge tone={version.decision.decision === "APPROVED" ? "success" : "warning"}>
                    <UiText>{version.decision.decision === "APPROVED" ? "승인" : "수정 요청"}</UiText>
                  </StatusBadge>
                ) : <StatusBadge tone="info"><UiText>{"검토 대기"}</UiText></StatusBadge>}
              </div>
              {version.description ? <p className="mt-3 whitespace-pre-wrap text-sm leading-6"><UiText>{version.description}</UiText></p> : null}
              {version.decision ? (
                <div className="mt-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-sm">
                  <h3 className="font-bold"><UiText>{version.decision.decision === "REVISION_REQUESTED" ? "수정 요청 사항" : "승인 의견"}</UiText></h3>
                  <p className="font-semibold"><span>{version.decision.reviewerName}</span>{" · "}<UiDate value={version.decision.decidedAt} mode="dateTime" /></p>
                  <p className="mt-1 whitespace-pre-wrap"><UiText>{version.decision.comment || "등록된 검토 의견이 없습니다."}</UiText></p>
                  {index === 0 && isTeamMember && version.decision.decision === "REVISION_REQUESTED" ? (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] pt-3">
                      <p className="font-semibold"><UiText>{canSubmit ? "요청 사항을 반영한 새 버전을 제출해 주세요." : `제출 기한이 지났습니다. 새 버전 제출 일정은 ${advisorEnabled ? "지도교수" : "프로젝트 관리자"}에게 확인해 주세요.`}</UiText></p>
                      {canSubmit ? <ReportSubmissionForm teamId={teamId} requirements={[submission]} triggerLabel="수정본 제출" triggerClassName="button-secondary" /> : null}
                    </div>
                  ) : null}
                </div>
              ) : canReview && index === 0 ? <ReportDecisionForm teamId={teamId} reportVersionId={version.id} /> : null}
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState variant="compact" title="아직 제출된 버전이 없습니다" description="보고서를 제출하면 버전별 검토 이력이 표시됩니다." />
      )}

      <section className="mt-5 border-t border-[var(--line)] pt-5">
        <h3 className="text-sm font-bold"><UiText>{"피드백"}</UiText></h3>
        {report.feedback.length ? (
          <ul className="mt-3 grid gap-2">
            {report.feedback.map((item) => (
              <li key={item.id} className="rounded-xl bg-[var(--surface-subtle)] p-3 text-sm">
                <p className="text-xs text-[var(--muted)]">{item.authorName}{" · "}<UiDate value={item.createdAt} mode="dateTime" /></p>
                <p className="mt-1 whitespace-pre-wrap"><UiText>{item.body}</UiText></p>
              </li>
            ))}
          </ul>
        ) : <EmptyState variant="compact" title="아직 피드백이 없습니다" />}
        {canReview ? <ReportFeedbackForm teamId={teamId} reportId={report.id} /> : null}
      </section>
    </article>
  );
}

export default async function TeamReportsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { workspace, reportWorkspace } = await loadTeamReportWorkspace(projectId);
  const now = new Date();
  const canReview = workspace.access.canSupervise && workspace.status !== "FORMING";
  const requiredReports = reportWorkspace.reports.filter((report) => report.required && report.submissionEnabled);
  const submittedCount = requiredReports.filter((report) => report.versions.length > 0).length;
  const submitEnabledReports = reportWorkspace.reports.filter((report) => report.submissionEnabled);
  const noSubmittableReports = workspace.status === "IN_PROGRESS" && workspace.access.canContribute && submitEnabledReports.length > 0 && submitEnabledReports.every((report) => !isReportSubmissionOpen(report, now));
  const emptyState = workspace.status === "FORMING"
    ? { title: "팀 확정 후 보고서를 제출할 수 있습니다", description: "팀이 확정되면 프로그램 보고서 일정에 따라 제출할 수 있습니다." }
    : workspace.status === "COMPLETED"
      ? { title: "종료된 프로젝트에 보고서 일정이 없습니다", description: "프로젝트 종료 전에 할당되거나 제출된 보고서가 없습니다." }
      : { title: "할당된 보고서가 없습니다", description: "프로그램 관리자가 보고서를 추가하면 이곳에 표시됩니다." };

  return (
    <section aria-labelledby="reports-title" className="mx-auto max-w-6xl space-y-7">
      <WorkspacePageHeader
        title="보고서"
        titleId="reports-title"
        description="프로그램 관리자가 정한 보고서를 제출하고 버전별 검토와 피드백을 확인합니다."
        bordered={false}
      />
      {reportWorkspace.reports.length === 0 ? (
        <EmptyState {...emptyState} />
      ) : (
        <div className="space-y-4">
          {noSubmittableReports ? <aside role="status" className="rounded-2xl border border-[var(--line)] bg-[var(--surface-subtle)] p-4 text-sm"><strong><UiText>{"현재 제출 가능한 보고서가 없습니다"}</UiText></strong><p className="mt-1 text-[var(--muted)]"><UiText>{"기존 제출·검토 이력은 아래에서 확인할 수 있습니다."}</UiText></p></aside> : null}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-bold tracking-[-0.04em]"><UiText>{"보고서 제출 현황"}</UiText></h2>
            <div className="flex items-center gap-2">
              {submittedCount ? <a href={`/api/projects/${projectId}/submissions`} className="button-secondary gap-2"><DownloadIcon className="size-4 shrink-0" /><UiText>{"제출물 전체 다운로드"}</UiText></a> : null}
              <span className="rounded-full bg-[var(--surface-subtle)] px-3 py-1.5 text-sm font-bold"><UiText>{"제출"}</UiText>{` ${submittedCount}/${requiredReports.length}`}</span>
            </div>
          </div>
          {reportWorkspace.reports.map((report) => (
            <ReportCard
              key={report.id}
              teamId={workspace.id}
              report={report}
              canSubmit={workspace.status === "IN_PROGRESS" && workspace.access.canContribute && isReportSubmissionOpen(report, now)}
              canReview={canReview}
              isTeamMember={workspace.access.isTeamMember}
              advisorEnabled={workspace.advisorEnabled}
            />
          ))}
        </div>
      )}
    </section>
  );
}
