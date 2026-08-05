import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ReportDecisionForm } from "@/app/teams/[teamId]/_components/report-decision-form";
import { RemoveReportRequirementForm, ReportRequirementForm } from "@/app/teams/[teamId]/_components/report-requirement-forms";
import { ReportFeedbackForm, ReportScoreForm } from "@/app/teams/[teamId]/_components/report-score-feedback-forms";
import { ReportSubmissionForm } from "@/app/teams/[teamId]/_components/report-submission-form";
import { WorkspacePageHeader } from "@/app/teams/[teamId]/_components/workspace-page-header";
import {
  isReportSubmissionOpen,
  reportPresentationState,
  selectStudentReportFocus,
  type ReportItem,
  type ReportPresentationState,
  type StudentReportFocus,
} from "@/app/teams/[teamId]/_lib/report-page-presentation";
import { loadTeamReportWorkspace } from "@/app/teams/[teamId]/_lib/team-workspace-data";
import type { ReportWorkspace } from "@/modules/report/application/report-ports";
import { getLocalizedMetadata } from "@/modules/translation/infrastructure/localized-metadata";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";
import { UiAside } from "@/modules/translation/ui/localized-elements";
import { EmptyState, StatusBadge } from "@/shared/ui/page-primitives";

export async function generateMetadata(): Promise<Metadata> {
  return getLocalizedMetadata("프로젝트 보고서");
}

const reportTypeLabel = {
  START: "착수 보고서",
  MIDTERM: "중간 보고서",
  FINAL: "결과 보고서",
} as const;

const feedbackRoleLabel = {
  STUDENT: "학생",
  PROFESSOR: "교수",
  ADMIN: "관리자",
} as const;

const reportStateView = {
  UNSUBMITTED: {
    label: "제출 전",
    tone: "info",
    iconClassName: "bg-[var(--primary-subtle)] text-[var(--primary-hover)]",
  },
  PENDING_REVIEW: {
    label: "검토 중",
    tone: "info",
    iconClassName: "bg-[var(--primary-subtle)] text-[var(--primary-hover)]",
  },
  REVISION_REQUESTED: {
    label: "수정 필요",
    tone: "warning",
    iconClassName: "bg-[var(--warning-subtle)] text-[var(--warning-ink)]",
  },
  APPROVED: {
    label: "승인 완료",
    tone: "success",
    iconClassName: "bg-[var(--success-subtle)] text-[var(--success)]",
  },
} as const satisfies Record<ReportPresentationState, {
  label: string;
  tone: "neutral" | "info" | "warning" | "success";
  iconClassName: string;
}>;

type ReportVersion = ReportWorkspace["reports"][number]["versions"][number];
type WorkspaceStatus = "FORMING" | "CONFIRMED" | "CLOSED";

function ReportDocumentIcon({ className }: { className: string }) {
  return (
    <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${className}`}>
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-[1.8] [stroke-linecap:round] [stroke-linejoin:round]">
        <path d="M6 3h8l4 4v14H6z" />
        <path d="M14 3v5h5M9 12h6M9 16h6" />
      </svg>
    </span>
  );
}

function ReportStatusCard({ title, description }: { title: string; description: string }) {
  return (
    <aside role="status" className="flex gap-4 rounded-[var(--radius-panel)] border border-[var(--line)] bg-white px-5 py-5 shadow-[0_10px_32px_rgba(31,35,48,0.055)] sm:px-6">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--primary-subtle)] text-[var(--primary-hover)]">
        <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]">
          <path d="M10 6v4M10 14h.01" />
          <circle cx="10" cy="10" r="7" />
        </svg>
      </span>
      <div>
        <strong className="text-[0.9375rem] text-[var(--ink)]"><UiText>{title}</UiText></strong>
        <p className="mt-1 text-sm leading-6 text-[var(--muted)]"><UiText>{description}</UiText></p>
      </div>
    </aside>
  );
}

type ReportPageStatus = { title: string; description: string } | null;

function reportPageStatus({
  workspaceStatus,
  hasNoSubmittableReports,
  advisorEnabled,
}: {
  workspaceStatus: WorkspaceStatus;
  hasNoSubmittableReports: boolean;
  advisorEnabled: boolean;
}): ReportPageStatus {
  if (workspaceStatus === "FORMING") {
    return {
      title: "팀 확정 후 제출할 수 있습니다",
      description: advisorEnabled
        ? "지도교수가 팀을 확정하면 제출 기간 내 보고서 버전을 등록할 수 있습니다."
        : "프로젝트 관리자가 팀을 확정하면 제출 기간 내 보고서 버전을 등록할 수 있습니다.",
    };
  }
  if (workspaceStatus === "CLOSED") {
    return {
      title: "종료된 프로젝트입니다",
      description: "새 보고서를 제출할 수 없으며 기존 제출·승인 이력만 확인할 수 있습니다.",
    };
  }
  return hasNoSubmittableReports
    ? { title: "현재 제출 가능한 보고서가 없습니다", description: "기존 제출·검토 이력은 아래에서 확인할 수 있습니다." }
    : null;
}

function focusCopy(focus: StudentReportFocus, advisorEnabled: boolean) {
  const reportLabel = reportTypeLabel[focus.report.type];
  const managerLabel = advisorEnabled ? "지도교수" : "프로젝트 관리자";

  switch (focus.kind) {
    case "REVISION":
      return {
        eyebrow: "수정 요청 도착",
        title: `${reportLabel} 수정 요청을 확인해 주세요`,
        description: `${managerLabel}의 의견을 반영한 새 버전이 필요합니다.`,
        linkLabel: "수정 요청 확인",
      };
    case "SUBMIT":
      return {
        eyebrow: "다음 제출",
        title: `${reportLabel} 제출을 준비해 주세요`,
        description: "아직 제출된 버전이 없습니다. 마감 전에 첫 버전을 등록해 주세요.",
        linkLabel: "제출 영역 보기",
      };
    case "REVISION_BLOCKED":
      return {
        eyebrow: "확인 필요",
        title: `${reportLabel} 수정 요청의 기한이 지났습니다`,
        description: `새 버전 제출 일정은 ${managerLabel}에게 확인해 주세요.`,
        linkLabel: "수정 요청 확인",
      };
    case "SUBMIT_BLOCKED":
      return {
        eyebrow: "기한 종료",
        title: `${reportLabel} 제출 기한이 지났습니다`,
        description: `추가 제출 가능 여부는 ${managerLabel}에게 확인해 주세요.`,
        linkLabel: "보고서 상태 확인",
      };
    case "WAITING":
      return {
        eyebrow: "검토 진행 중",
        title: `${reportLabel} 검토를 기다리고 있습니다`,
        description: "최신 버전이 제출되었습니다. 검토 결과가 등록되면 이 화면에서 확인할 수 있습니다.",
        linkLabel: "제출 내역 확인",
      };
    case "COMPLETE":
      return {
        eyebrow: "검토 완료",
        title: "모든 보고서 검토가 완료되었습니다",
        description: "승인된 보고서와 검토 의견을 아래에서 다시 확인할 수 있습니다.",
        linkLabel: "완료 내역 보기",
      };
  }
}

function StudentReportFocusCard({ focus, advisorEnabled }: { focus: StudentReportFocus; advisorEnabled: boolean }) {
  const copy = focusCopy(focus, advisorEnabled);
  const blocked = focus.kind === "REVISION_BLOCKED" || focus.kind === "SUBMIT_BLOCKED";
  const complete = focus.kind === "COMPLETE";
  const revision = focus.kind === "REVISION";
  const shellClassName = blocked
    ? "border-[var(--danger)] bg-[linear-gradient(135deg,var(--danger-subtle),#fff_76%)]"
    : complete
      ? "border-[var(--success)] bg-[linear-gradient(135deg,var(--success-subtle),#fff_76%)]"
      : revision
        ? "border-[var(--warning)] bg-[linear-gradient(135deg,var(--warning-subtle),#fff_76%)]"
        : "border-[#b9c8fb] bg-[linear-gradient(135deg,var(--primary-subtle),#fff_76%)]";
  const iconClassName = blocked
    ? "bg-[var(--danger)] text-white"
    : complete
      ? "bg-[var(--success)] text-white"
      : revision
        ? "bg-[var(--warning)] text-white"
        : "bg-[var(--primary)] text-white";

  return (
    <UiAside aria-labelledby="student-report-focus-title" className={`relative overflow-hidden rounded-[var(--radius-panel)] border p-5 shadow-[0_14px_38px_rgba(31,35,48,0.07)] sm:p-7 ${shellClassName}`}>
      <div aria-hidden="true" className="absolute -right-14 -top-16 size-44 rounded-full bg-white/55" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 gap-4">
          <span className={`grid size-12 shrink-0 place-items-center rounded-2xl shadow-sm ${iconClassName}`}>
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6 fill-none stroke-current stroke-[1.9] [stroke-linecap:round] [stroke-linejoin:round]">
              {complete ? <path d="m6 12 4 4 8-9" /> : <><path d="M12 7v5M12 16h.01" /><circle cx="12" cy="12" r="9" /></>}
            </svg>
          </span>
          <div className="min-w-0">
            <p className="text-xs font-black tracking-[0.12em] text-[var(--primary-hover)]"><UiText>{copy.eyebrow}</UiText></p>
            <h2 id="student-report-focus-title" className="mt-1.5 text-xl font-black leading-tight tracking-[-0.035em] text-[var(--ink)] sm:text-2xl">
              <UiText>{copy.title}</UiText>
            </h2>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[var(--ink)]"><UiText>{copy.description}</UiText></p>
            {focus.kind !== "COMPLETE" ? (
              <p className="mt-2 text-sm font-bold text-[var(--ink)]">
                <UiText>{"마감"}</UiText>{" "}
                <time dateTime={focus.report.dueAt.toISOString()}><UiDate value={focus.report.dueAt} mode="dateTime" /></time>
              </p>
            ) : null}
          </div>
        </div>
        <a href={`#report-${focus.report.type.toLowerCase()}`} className="button-primary relative shrink-0 self-start sm:self-auto">
          <UiText>{copy.linkLabel}</UiText>
        </a>
      </div>
    </UiAside>
  );
}

function ReportReviewFeedback({
  versionId,
  decision,
  showRevisionGuidance,
  canResubmit,
  advisorEnabled,
  revisionAction,
}: {
  versionId: string;
  decision: NonNullable<ReportVersion["decision"]>;
  showRevisionGuidance: boolean;
  canResubmit: boolean;
  advisorEnabled: boolean;
  revisionAction?: ReactNode;
}) {
  const revisionRequested = decision.decision === "REVISION_REQUESTED";
  const title = revisionRequested ? "수정 요청 사항" : "승인 의견";
  return (
    <aside
      aria-labelledby={`report-feedback-title-${versionId}`}
      className={`mt-4 rounded-2xl border px-4 py-4 sm:px-5 sm:py-5 ${
        revisionRequested
          ? "border-[var(--warning)] bg-[var(--warning-subtle)]"
          : "border-[var(--success)] bg-[var(--success-subtle)]"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-5 gap-y-1">
        <h3 id={`report-feedback-title-${versionId}`} className="text-[0.9375rem] font-extrabold text-[var(--ink)]">
          <UiText>{title}</UiText>
        </h3>
        <p className="text-[0.8125rem] font-medium leading-5 text-[var(--ink)]">
          <span className="font-bold">{decision.reviewerName}</span>
          <span aria-hidden="true"> · </span>
          <time dateTime={decision.decidedAt.toISOString()}><UiDate value={decision.decidedAt} mode="dateTime" /></time>
        </p>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-[0.9375rem] leading-6 text-[var(--ink)]">
        <UiText>{decision.comment || "등록된 검토 의견이 없습니다."}</UiText>
      </p>
      {revisionRequested && showRevisionGuidance ? (
        <div className="mt-4 flex flex-col gap-3 rounded-xl bg-white/65 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-bold leading-6 text-[var(--warning-ink)]">
            <UiText>{canResubmit
              ? "요청 사항을 반영한 새 버전을 제출해 주세요."
              : advisorEnabled
                ? "제출 기한이 지났습니다. 새 버전 제출 일정은 지도교수에게 확인해 주세요."
                : "제출 기한이 지났습니다. 새 버전 제출 일정은 프로젝트 관리자에게 확인해 주세요."}</UiText>
          </p>
          {canResubmit && revisionAction ? <div className="shrink-0">{revisionAction}</div> : null}
        </div>
      ) : null}
    </aside>
  );
}

function versionStatus(version: ReportVersion, latest: boolean) {
  if (version.decision?.decision === "APPROVED") return { label: "승인", tone: "success" as const };
  if (version.decision?.decision === "REVISION_REQUESTED") return { label: "수정 요청", tone: "warning" as const };
  return latest
    ? { label: "검토 대기", tone: "info" as const }
    : { label: "이전 버전", tone: "neutral" as const };
}

function ReportVersionEntry({
  teamId,
  report,
  version,
  latest,
  now,
  workspaceStatus,
  canSupervise,
  isTeamMember,
  advisorEnabled,
  previous = false,
}: {
  teamId: string;
  report: ReportItem;
  version: ReportVersion;
  latest: boolean;
  now: Date;
  workspaceStatus: WorkspaceStatus;
  canSupervise: boolean;
  isTeamMember: boolean;
  advisorEnabled: boolean;
  previous?: boolean;
}) {
  const status = versionStatus(version, latest);
  const canResubmit = workspaceStatus === "CONFIRMED" && isReportSubmissionOpen(report, now);

  return (
    <div className={`rounded-2xl p-4 sm:p-5 ${previous ? "bg-[var(--surface-subtle)]" : "bg-[#f4f7ff]"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <a href={`/api/files/${version.fileId}`} className="text-[0.9375rem] font-bold text-[var(--primary-hover)] underline-offset-4 [overflow-wrap:anywhere] hover:underline sm:text-base">
            v{version.version} · {version.fileName}
          </a>
          <p className="mt-1 text-[0.8125rem] font-medium leading-5 text-[var(--ink)]">
            {version.submitterName}<span aria-hidden="true"> · </span>
            <UiDate value={version.submittedAt} mode="date" />
          </p>
        </div>
        <StatusBadge tone={status.tone}><UiText>{status.label}</UiText></StatusBadge>
      </div>
      {version.description ? <p className="mt-3 max-w-3xl text-[0.9375rem] leading-6 text-[var(--ink)]"><UiText>{version.description}</UiText></p> : null}
      {version.decision ? (
        <ReportReviewFeedback
          versionId={version.id}
          decision={version.decision}
          showRevisionGuidance={isTeamMember && latest}
          canResubmit={canResubmit}
          advisorEnabled={advisorEnabled}
          revisionAction={isTeamMember && latest ? (
            <ReportSubmissionForm
              teamId={teamId}
              requirements={[{ type: report.type, dueAt: report.dueAt }]}
              triggerLabel="수정본 제출"
              triggerClassName="button-secondary"
            />
          ) : undefined}
        />
      ) : workspaceStatus === "CONFIRMED" && canSupervise && latest ? (
        <ReportDecisionForm teamId={teamId} reportVersionId={version.id} />
      ) : null}
    </div>
  );
}

function ReportScoreFeedbackSection({
  teamId,
  report,
  canScore,
  canFeedback,
}: {
  teamId: string;
  report: ReportItem;
  canScore: boolean;
  canFeedback: boolean;
}) {
  const hasScore = report.score !== undefined;

  return (
    <div className="mt-5 grid gap-5 border-t border-[var(--line)] pt-5 lg:grid-cols-2">
      {hasScore || canScore ? (
        <section aria-labelledby={`report-score-${report.id}`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 id={`report-score-${report.id}`} className="text-sm font-bold"><UiText>{"보고서 점수"}</UiText></h3>
            {hasScore ? (
              <p className="text-sm">
                <strong className="text-lg tabular-nums text-[var(--primary)]">{report.score}</strong>
                <span className="text-[var(--muted)]"> / 100</span>
                {report.scoredByName ? <span className="ml-2 text-xs text-[var(--muted)]">· {report.scoredByName}</span> : null}
              </p>
            ) : <span className="text-xs text-[var(--muted)]"><UiText>{"아직 점수가 없습니다."}</UiText></span>}
          </div>
          {hasScore && report.scoreComment ? (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6"><UiText>{report.scoreComment}</UiText></p>
          ) : null}
          {canScore ? (
            <ReportScoreForm
              teamId={teamId}
              reportId={report.id}
              currentScore={report.score}
              currentComment={report.scoreComment}
            />
          ) : null}
        </section>
      ) : null}

      <section aria-labelledby={`report-feedback-${report.id}`} className={hasScore || canScore ? "lg:border-l lg:border-[var(--line)] lg:pl-5" : "lg:col-span-2"}>
        <h3 id={`report-feedback-${report.id}`} className="text-sm font-bold">
          <UiText>{"피드백"}</UiText>
          {report.feedback.length ? <span className="ml-1 text-xs font-normal text-[var(--muted)]">{report.feedback.length}</span> : null}
        </h3>
        {report.feedback.length ? (
          <ul className="mt-3 space-y-3">
            {report.feedback.map((item) => (
              <li key={item.id} className="rounded-[var(--radius-control)] bg-[var(--surface-subtle)] px-4 py-3">
                <p className="text-xs text-[var(--muted)]">
                  <span className="font-semibold text-[var(--ink)]">{item.authorName}</span>
                  <span className="ml-1"><UiText>{feedbackRoleLabel[item.authorRole]}</UiText></span>
                  <span aria-hidden="true"> · </span>
                  <time dateTime={item.createdAt.toISOString()}><UiDate value={item.createdAt} mode="dateTime" /></time>
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6"><UiText>{item.body}</UiText></p>
              </li>
            ))}
          </ul>
        ) : <p className="mt-2 text-sm text-[var(--muted)]"><UiText>{"아직 피드백이 없습니다."}</UiText></p>}
        {canFeedback ? <ReportFeedbackForm teamId={teamId} reportId={report.id} /> : null}
      </section>
    </div>
  );
}

function ReportCard({
  teamId,
  report,
  now,
  workspaceStatus,
  canManageRequirements,
  canContribute,
  canSupervise,
  isTeamMember,
  advisorEnabled,
  canScore,
  canFeedback,
}: {
  teamId: string;
  report: ReportItem;
  now: Date;
  workspaceStatus: WorkspaceStatus;
  canManageRequirements: boolean;
  canContribute: boolean;
  canSupervise: boolean;
  isTeamMember: boolean;
  advisorEnabled: boolean;
  canScore: boolean;
  canFeedback: boolean;
}) {
  const state = reportPresentationState(report);
  const stateView = reportStateView[state];
  const latestVersion = report.versions[0];
  const previousVersions = report.versions.slice(1);
  const submissionOpen = workspaceStatus === "CONFIRMED" && canContribute && isReportSubmissionOpen(report, now);
  const showHeaderSubmission = submissionOpen && latestVersion && state !== "REVISION_REQUESTED";
  const titleId = `report-title-${report.type.toLowerCase()}`;

  return (
    <article
      id={`report-${report.type.toLowerCase()}`}
      aria-labelledby={titleId}
      className="scroll-mt-6 overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-white shadow-[0_12px_34px_rgba(31,35,48,0.06)]"
    >
      <div className="p-5 sm:p-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-3.5">
            <ReportDocumentIcon className={stateView.iconClassName} />
            <div className="min-w-0">
              <h2 id={titleId} className="text-lg font-black tracking-[-0.03em] text-[var(--ink)] sm:text-xl">
                <UiText>{reportTypeLabel[report.type]}</UiText>
              </h2>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem] font-medium leading-5 text-[var(--muted)]">
                <span><UiText>{"마감"}</UiText>{" "}<time className="font-bold text-[var(--ink)]" dateTime={report.dueAt.toISOString()}><UiDate value={report.dueAt} mode="dateTime" /></time></span>
                <span aria-hidden="true">·</span>
                <span>{report.versions.length}<UiText>{"개 버전"}</UiText></span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <StatusBadge tone={stateView.tone}><UiText>{stateView.label}</UiText></StatusBadge>
            {showHeaderSubmission ? (
              <ReportSubmissionForm
                teamId={teamId}
                requirements={[{ type: report.type, dueAt: report.dueAt }]}
                triggerLabel="새 버전 제출"
                triggerClassName="button-quiet"
              />
            ) : null}
          </div>
        </header>

        <div className="mt-5">
          {latestVersion ? (
            <ReportVersionEntry
              teamId={teamId}
              report={report}
              version={latestVersion}
              latest
              now={now}
              workspaceStatus={workspaceStatus}
              canSupervise={canSupervise}
              isTeamMember={isTeamMember}
              advisorEnabled={advisorEnabled}
            />
          ) : (
            <div className="flex flex-col gap-4 rounded-2xl bg-[var(--primary-subtle)] px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div>
                <p className="font-bold text-[var(--ink)]"><UiText>{"아직 제출된 버전이 없습니다."}</UiText></p>
                <p className="mt-1 text-sm font-medium leading-6 text-[var(--primary-hover)]">
                  <UiText>{submissionOpen ? "마감 전에 첫 버전을 등록해 주세요." : "제출 가능 상태와 일정을 확인해 주세요."}</UiText>
                </p>
              </div>
              {submissionOpen ? (
                <ReportSubmissionForm
                  teamId={teamId}
                  requirements={[{ type: report.type, dueAt: report.dueAt }]}
                  triggerLabel="보고서 제출"
                  triggerClassName="button-primary shrink-0"
                />
              ) : null}
            </div>
          )}
        </div>

        {previousVersions.length ? (
          <details className="group mt-4 rounded-2xl bg-[#fbfcff] px-4 py-3.5 sm:px-5">
            <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-4 text-sm font-bold text-[var(--primary-hover)] [&::-webkit-details-marker]:hidden">
              <span><UiText>{`${previousVersions.length}개 이전 버전 보기`}</UiText></span>
              <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5 shrink-0 fill-none stroke-current stroke-[1.8] transition-transform group-open:rotate-180 [stroke-linecap:round] [stroke-linejoin:round]"><path d="m6 8 4 4 4-4" /></svg>
            </summary>
            <ol className="mt-3 grid gap-3">
              {previousVersions.map((version) => (
                <li key={version.id}>
                  <ReportVersionEntry
                    teamId={teamId}
                    report={report}
                    version={version}
                    latest={false}
                    now={now}
                    workspaceStatus={workspaceStatus}
                    canSupervise={canSupervise}
                    isTeamMember={isTeamMember}
                    advisorEnabled={advisorEnabled}
                    previous
                  />
                </li>
              ))}
            </ol>
          </details>
        ) : null}

        <ReportScoreFeedbackSection
          teamId={teamId}
          report={report}
          canScore={canScore}
          canFeedback={canFeedback}
        />

        {canManageRequirements ? (
          <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-[var(--surface-subtle)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-[var(--ink)]"><UiText>{"보고서 일정 관리"}</UiText></p>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]"><UiText>{"제출 이력이 생기면 이 일정은 고정됩니다."}</UiText></p>
            </div>
            <RemoveReportRequirementForm teamId={teamId} type={report.type} disabled={report.versions.length > 0} />
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default async function TeamReportsPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const { workspace, reportWorkspace } = await loadTeamReportWorkspace(teamId);
  const now = new Date();
  const submittableReports = reportWorkspace.reports.filter((report) => isReportSubmissionOpen(report, now));
  const canManageRequirements = workspace.status !== "CLOSED" && workspace.access.canSupervise;
  const canScore = workspace.access.canSupervise && workspace.status !== "FORMING";
  const canFeedback = (workspace.access.isTeamMember || workspace.access.canSupervise) && workspace.status !== "FORMING";
  const earliestDueAt = workspace.schedule.executionStartsAt > now ? workspace.schedule.executionStartsAt : now;
  const hasNoSubmittableReports = workspace.status === "CONFIRMED"
    && workspace.access.canContribute
    && reportWorkspace.reports.length > 0
    && submittableReports.length === 0;
  const currentReportPageStatus = reportPageStatus({
    workspaceStatus: workspace.status,
    hasNoSubmittableReports,
    advisorEnabled: workspace.advisorEnabled,
  });
  const studentFocus = workspace.status === "CONFIRMED" && workspace.access.canContribute
    ? selectStudentReportFocus(reportWorkspace.reports, now)
    : null;
  const submittedCount = reportWorkspace.reports.filter((report) => report.versions.length > 0).length;
  const approvedCount = reportWorkspace.reports.filter((report) => reportPresentationState(report) === "APPROVED").length;
  const emptyReportState = workspace.status === "FORMING"
    ? {
        title: "팀 확정 후 보고서를 제출할 수 있습니다",
        description: workspace.advisorEnabled
          ? "지도교수가 팀을 확정하고 보고서 일정을 정하면 여기에서 시작할 수 있습니다."
          : "프로젝트 관리자가 팀을 확정하고 보고서 일정을 정하면 여기에서 시작할 수 있습니다.",
      }
    : workspace.status === "CLOSED"
      ? {
          title: "종료된 프로젝트에 보고서 일정이 없습니다",
          description: "프로젝트 종료 전에 설정되거나 제출된 보고서가 없습니다.",
        }
      : {
          title: "보고서 일정이 없습니다",
          description: workspace.access.canContribute
            ? workspace.advisorEnabled
              ? "지도교수가 보고서 종류와 마감을 정하면 여기에서 시작할 수 있습니다."
              : "프로젝트 관리자가 보고서 종류와 마감을 정하면 여기에서 시작할 수 있습니다."
            : "첫 보고서 종류와 마감을 정해 주세요.",
        };

  return (
    <section aria-labelledby="reports-title" className="mx-auto max-w-6xl space-y-7">
      <WorkspacePageHeader
        eyebrow="프로젝트 문서"
        title="보고서"
        titleId="reports-title"
        description="제출 일정과 버전별 피드백, 승인 상태를 확인합니다."
        bordered={false}
        actions={canManageRequirements ? (
          <ReportRequirementForm
            teamId={workspace.id}
            executionStartsAt={earliestDueAt}
            submissionEndsAt={workspace.schedule.submissionEndsAt}
          />
        ) : undefined}
      />

      {studentFocus ? <StudentReportFocusCard focus={studentFocus} advisorEnabled={workspace.advisorEnabled} /> : null}

      {reportWorkspace.reports.length > 0 && currentReportPageStatus ? <ReportStatusCard {...currentReportPageStatus} /> : null}

      {reportWorkspace.reports.length === 0 ? <EmptyState {...emptyReportState} /> : (
        <div id="report-list" className="space-y-4 scroll-mt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black tracking-[0.12em] text-[var(--primary)]"><UiText>{"제출 현황"}</UiText></p>
              <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-[var(--ink)]"><UiText>{"보고서 일정"}</UiText></h2>
            </div>
            <div className="flex flex-wrap gap-2 text-sm font-bold">
              <span className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-[var(--ink)]">
                <UiText>{"제출"}</UiText>{" "}{submittedCount}/{reportWorkspace.reports.length}
              </span>
              <span className="rounded-full bg-[var(--success-subtle)] px-3 py-1.5 text-[var(--success)]">
                <UiText>{"승인"}</UiText>{" "}{approvedCount}/{reportWorkspace.reports.length}
              </span>
            </div>
          </div>

          <div className="grid gap-4">
            {reportWorkspace.reports.map((report) => (
              <ReportCard
                key={report.id}
                teamId={workspace.id}
                report={report}
                now={now}
                workspaceStatus={workspace.status}
                canManageRequirements={canManageRequirements}
                canContribute={workspace.access.canContribute}
                canSupervise={workspace.access.canSupervise}
                isTeamMember={workspace.access.isTeamMember}
                advisorEnabled={workspace.advisorEnabled}
                canScore={canScore}
                canFeedback={canFeedback}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
