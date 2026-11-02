import type { Metadata } from "next";

import { ReportDecisionForm } from "@/app/projects/[projectId]/_components/report-decision-form";
import { ReportFeedbackForm } from "@/app/projects/[projectId]/_components/report-score-feedback-forms";
import { ReportSubmissionForm } from "@/app/projects/[projectId]/_components/report-submission-form";
import { monthDay, rowActionClass, WorkspacePageHeader } from "@/app/projects/[projectId]/_components/workspace-page-header";
import {
  isReportSubmissionOpen,
  reportPresentationState,
  selectStudentReportFocus,
  type StudentReportFocus,
} from "@/app/projects/[projectId]/_lib/report-page-presentation";
import { loadTeamReportWorkspace } from "@/app/projects/[projectId]/_lib/team-workspace-data";
import type { ReportWorkspace } from "@/modules/report/application/report-ports";
import { cardClass, CardHead, daysLabel, daysUntil, Pill } from "@/modules/project-program/ui/work-screen";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";
import { EmptyState } from "@/shared/ui/page-primitives";
import { DownloadIcon } from "@/shared/ui/workspace-icons";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("프로젝트 보고서");
}

type ReportItem = ReportWorkspace["reports"][number];

// 진행 중인 것(검토 중)만 파랑, 손볼 일(수정 필요)은 노랑, 끝난 것은 초록과 회색.
const stateView = {
  UNSUBMITTED: { label: "제출 전", tone: "plain" },
  PENDING_REVIEW: { label: "검토 중", tone: "accent" },
  REVISION_REQUESTED: { label: "수정 필요", tone: "warning" },
  APPROVED: { label: "승인 완료", tone: "success" },
} as const;

/** 학생이 지금 챙길 보고서 한 건을 문장으로. 수정 요청이 먼저, 그다음 가장 가까운 마감. */
function focusSentence({ kind, report }: StudentReportFocus, requiredCount: number, now: Date): string {
  const due = `${monthDay.format(report.dueAt)}(${daysLabel(daysUntil(report.dueAt, now))})`;
  if (kind === "REVISION") return `${report.title} 수정 요청을 받았습니다. ${due}까지 수정본을 내 주세요.`;
  if (kind === "SUBMIT") return `다음 마감은 ${report.title}, ${due}입니다.`;
  if (kind === "REVISION_BLOCKED") return `${report.title} 수정 요청이 남아 있지만 제출 기한이 지났습니다.`;
  if (kind === "SUBMIT_BLOCKED") return `${report.title} 제출 기한이 지났습니다.`;
  if (kind === "WAITING") return `${report.title} 검토를 기다리는 중입니다.`;
  return `필수 보고서 ${requiredCount}건이 모두 승인되었습니다.`;
}

function ReportBlock({
  teamId,
  report,
  canSubmit,
  canReview,
  isTeamMember,
  advisorEnabled,
  isFocus,
  isReviewFocus,
  now,
}: {
  teamId: string;
  report: ReportItem;
  canSubmit: boolean;
  canReview: boolean;
  isTeamMember: boolean;
  advisorEnabled: boolean;
  isFocus: boolean;
  isReviewFocus: boolean;
  now: Date;
}) {
  const state = reportPresentationState(report);
  const presentation = stateView[state];
  const latest = report.versions[0];
  const submission = { id: report.id, title: report.title, dueAt: report.dueAt };
  const submitClass = isFocus ? "button-primary button-compact min-h-8 px-3" : rowActionClass;
  const overdue = state === "UNSUBMITTED" && report.submissionEnabled && report.dueAt < now;

  return (
    <article
      id={`report-${report.id}`}
      aria-labelledby={`report-title-${report.id}`}
      className="grid scroll-mt-6 gap-x-8 gap-y-3 border-t border-[var(--line)] px-5 py-4 @min-[56rem]:grid-cols-[17rem_minmax(0,1fr)]"
    >
      {/* 왼쪽: 무엇을, 언제까지, 지금 어디에 있는지. 오른쪽: 낸 버전과 받은 의견. */}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <h2 id={`report-title-${report.id}`} className="text-base font-semibold leading-6 text-[var(--ink)]"><UiText>{report.title}</UiText></h2>
          <Pill>{!report.submissionEnabled ? "보관됨" : report.required ? "필수 제출" : "선택 제출"}</Pill>
        </div>
        <p className="mt-0.5 text-[0.8125rem] tabular-nums text-[var(--muted)]">
          <UiText>{"제출 마감"}</UiText>{" "}
          <time dateTime={report.dueAt.toISOString()}><UiDate value={report.dueAt} mode="dateTime" /></time>
        </p>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          {overdue ? <Pill tone="danger">{"기한 초과"}</Pill> : <Pill tone={presentation.tone}>{presentation.label}</Pill>}
          {state === "UNSUBMITTED" && !overdue && report.submissionEnabled ? <span className="text-xs text-[var(--muted)]"><UiText>{daysLabel(daysUntil(report.dueAt, now))}</UiText></span> : null}
          {canSubmit && state !== "REVISION_REQUESTED" ? (
            <ReportSubmissionForm teamId={teamId} requirements={[submission]} triggerLabel={latest ? "새 버전 제출" : "보고서 제출"} triggerClassName={submitClass} />
          ) : null}
        </div>
      </div>

      <div className="min-w-0">
        {report.versions.length ? (
          <ol className="grid gap-3">
            {report.versions.map((version, index) => (
              <li key={version.id} className="min-w-0 text-[0.8125rem] [&+li]:border-t [&+li]:border-[var(--line)] [&+li]:pt-3">
                <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="w-6 shrink-0 tabular-nums text-[var(--muted)]">v{version.version}</span>
                  <a href={`/api/files/${version.fileId}`} className="min-w-0 font-medium text-[var(--ink)] [overflow-wrap:anywhere] hover:text-[var(--primary)] hover:underline hover:underline-offset-[3px]">{version.fileName}</a>
                  <span className="text-xs tabular-nums text-[var(--muted)]"><span>{version.submitterName}</span>, <UiDate value={version.submittedAt} mode="dateTime" /></span>
                </div>
                {version.description ? <p className="mt-1 whitespace-pre-wrap pl-8 leading-5 text-[var(--ink)]"><UiText>{version.description}</UiText></p> : null}
                {version.decision ? (
                  <div className={`ml-8 mt-2 border-l-2 pl-3 ${version.decision.decision === "REVISION_REQUESTED" ? "border-[var(--warning)]" : "border-[var(--line-strong)]"}`}>
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <h3 className="font-semibold text-[var(--ink)]"><UiText>{version.decision.decision === "REVISION_REQUESTED" ? "수정 요청 사항" : "승인 의견"}</UiText></h3>
                      <span className="text-xs tabular-nums text-[var(--muted)]"><span>{version.decision.reviewerName}</span>, <UiDate value={version.decision.decidedAt} mode="dateTime" /></span>
                    </div>
                    <p className="mt-0.5 whitespace-pre-wrap leading-5 text-[var(--ink)]"><UiText>{version.decision.comment || "등록된 검토 의견이 없습니다."}</UiText></p>
                    {index === 0 && isTeamMember && version.decision.decision === "REVISION_REQUESTED" ? (
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                        <p className="font-medium text-[var(--ink)]"><UiText>{canSubmit ? "요청 사항을 반영한 새 버전을 제출해 주세요." : `제출 기한이 지났습니다. 새 버전 제출 일정은 ${advisorEnabled ? "지도교수" : "프로젝트 관리자"}에게 확인해 주세요.`}</UiText></p>
                        {canSubmit ? <ReportSubmissionForm teamId={teamId} requirements={[submission]} triggerLabel="수정본 제출" triggerClassName={submitClass} /> : null}
                      </div>
                    ) : null}
                  </div>
                ) : canReview && index === 0 ? <div className="mt-2 pl-8"><ReportDecisionForm teamId={teamId} reportVersionId={version.id} triggerClassName={isReviewFocus ? "button-primary button-compact min-h-8 px-3" : undefined} /></div> : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-[0.8125rem] text-[var(--muted)]"><UiText>{"아직 제출된 버전이 없습니다"}</UiText></p>
        )}

        {/*
          피드백이 없을 때 빈 상태를 띄우면 바로 위 승인 의견과 부딪혀 의견이 없는 것처럼 읽힌다.
          남길 사람에게만 빈 자리를 보이고, 읽는 사람에게는 있을 때만 보인다.
        */}
        {report.feedback.length || canReview ? (
          <section className="mt-3 border-t border-[var(--line)] pt-3 text-[0.8125rem]">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-[var(--ink)]"><UiText>{"피드백"}</UiText></h3>
              <span className="tabular-nums text-[var(--muted)]">{report.feedback.length}<UiText>{"건"}</UiText></span>
              {canReview ? <span className="ml-auto"><ReportFeedbackForm teamId={teamId} reportId={report.id} /></span> : null}
            </div>
            {report.feedback.length ? (
              <ul className="mt-2 grid gap-2">
                {report.feedback.map((item) => (
                  <li key={item.id}>
                    <p className="text-xs tabular-nums text-[var(--muted)]">{item.authorName}, <UiDate value={item.createdAt} mode="dateTime" /></p>
                    <p className="mt-0.5 whitespace-pre-wrap leading-5 text-[var(--ink)]"><UiText>{item.body}</UiText></p>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}
      </div>
    </article>
  );
}

export default async function TeamReportsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { workspace, reportWorkspace } = await loadTeamReportWorkspace(projectId);
  const now = new Date();
  const canReview = workspace.access.canSupervise && workspace.status !== "FORMING";
  const canContribute = workspace.status === "IN_PROGRESS" && workspace.access.canContribute;
  const requiredReports = reportWorkspace.reports.filter((report) => report.required && report.submissionEnabled);
  const submittedCount = requiredReports.filter((report) => report.versions.length > 0).length;
  const overdueCount = requiredReports.filter((report) => report.versions.length === 0 && report.dueAt < now).length;
  const waitingReview = reportWorkspace.reports.filter((report) => report.versions[0] && !report.versions[0].decision);
  const waitingReviewCount = waitingReview.length;
  // 지도하는 쪽에게는 가장 먼저 검토할 제출본 하나의 검토 버튼을 채운 버튼으로 둔다.
  const firstWaitingReview = waitingReview[0];
  const submitEnabledReports = reportWorkspace.reports.filter((report) => report.submissionEnabled);
  const noSubmittableReports = canContribute && submitEnabledReports.length > 0 && submitEnabledReports.every((report) => !isReportSubmissionOpen(report, now));
  const focus = workspace.access.isTeamMember ? selectStudentReportFocus(reportWorkspace.reports, now) : null;
  const emptyState = workspace.status === "FORMING"
    ? { title: "팀 확정 후 보고서를 제출할 수 있습니다", description: "팀이 확정되면 프로그램 보고서 일정에 따라 제출할 수 있습니다." }
    : workspace.status === "COMPLETED"
      ? { title: "종료된 프로젝트에 보고서 일정이 없습니다", description: "프로젝트 종료 전에 할당되거나 제출된 보고서가 없습니다." }
      : { title: "할당된 보고서가 없습니다", description: "프로그램 관리자가 보고서를 추가하면 이곳에 표시됩니다." };

  // 제목 밑 한 줄: 넘긴 마감은 굵게, 그다음 학생은 챙길 보고서 한 건, 지도하는 쪽은 검토할 제출본 수.
  // 넘긴 마감을 이미 굵게 말했으면 같은 보고서의 "기한이 지났습니다"는 되풀이하지 않는다.
  const focusText = focus && !(focus.kind === "SUBMIT_BLOCKED" && overdueCount) ? focusSentence(focus, requiredReports.length, now) : null;
  const parts = [
    overdueCount ? <b key="overdue" className="font-semibold"><UiText>{`필수 보고서 ${overdueCount}건이 기한을 넘겼습니다.`}</UiText></b> : null,
    focusText ? <UiText key="focus">{focusText}</UiText> : null,
    !focus && canReview && waitingReviewCount ? <UiText key="review">{`검토를 기다리는 제출본이 ${waitingReviewCount}건입니다.`}</UiText> : null,
    noSubmittableReports
      ? <span key="closed" role="status" className="text-[var(--muted)]"><strong className="font-medium"><UiText>{"현재 제출 가능한 보고서가 없습니다"}</UiText></strong>{". "}<UiText>{"기존 제출·검토 이력은 아래에서 확인할 수 있습니다."}</UiText></span>
      : null,
  ].filter(Boolean);
  const finding = reportWorkspace.reports.length && parts.length
    ? <p>{parts.flatMap((part, index) => index ? [" ", part] : [part])}</p>
    : null;

  return (
    <section aria-labelledby="reports-title" className="mx-auto grid max-w-6xl gap-5">
      <WorkspacePageHeader
        title="보고서"
        titleId="reports-title"
        finding={finding}
        actions={submittedCount ? <a href={`/api/projects/${projectId}/submissions`} className={`${rowActionClass} gap-1.5`}><DownloadIcon className="size-4 shrink-0" /><UiText>{"제출물 전체 다운로드"}</UiText></a> : undefined}
      />
      {reportWorkspace.reports.length === 0 ? (
        <div className={cardClass}><EmptyState {...emptyState} /></div>
      ) : (
        <section aria-labelledby="report-list-title" className={`${cardClass} @container`}>
          <CardHead
            id="report-list-title"
            title={<UiText>{"제출과 검토"}</UiText>}
            count={requiredReports.length ? <UiText>{`필수 ${submittedCount} / ${requiredReports.length}건 제출`}</UiText> : undefined}
          />
          {reportWorkspace.reports.map((report) => (
            <ReportBlock
              key={report.id}
              teamId={workspace.id}
              report={report}
              canSubmit={canContribute && isReportSubmissionOpen(report, now)}
              canReview={canReview}
              isTeamMember={workspace.access.isTeamMember}
              advisorEnabled={workspace.advisorEnabled}
              isFocus={focus?.report.id === report.id}
              isReviewFocus={canReview && firstWaitingReview?.id === report.id}
              now={now}
            />
          ))}
        </section>
      )}
    </section>
  );
}
