import type { Metadata } from "next";

import { loadTeamReportWorkspace } from "@/app/teams/[teamId]/_lib/team-workspace-data";
import { ReportDecisionForm } from "@/app/teams/[teamId]/_components/report-decision-form";
import { RemoveReportRequirementForm, ReportRequirementForm } from "@/app/teams/[teamId]/_components/report-requirement-forms";
import { ReportSubmissionForm } from "@/app/teams/[teamId]/_components/report-submission-form";
import { MobileFieldLabel, WorkspacePageHeader } from "@/app/teams/[teamId]/_components/workspace-page-header";
import { EmptyState, StatusBadge } from "@/shared/ui/page-primitives";

export const metadata: Metadata = { title: "프로젝트 보고서" };
const koreanDate = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium" });
const koreanDateTime = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" });
const reportTypeLabel = { START: "착수 보고서", MIDTERM: "중간 보고서", FINAL: "결과 보고서" } as const;

function ReportStatusStrip({ title, description }: { title: string; description: string }) {
  return (
    <aside role="status" className="flex flex-col gap-1 border-y border-[var(--line)] bg-[var(--surface-subtle)] px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
      <strong className="shrink-0 text-sm text-[var(--ink)]">{title}</strong>
      <p className="text-sm leading-6 text-[var(--muted)]">{description}</p>
    </aside>
  );
}

export default async function TeamReportsPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const { actor, workspace, reportWorkspace } = await loadTeamReportWorkspace(teamId);
  const now = new Date();
  const submittableReports = reportWorkspace.reports.filter((report) => report.dueAt >= now).map(({ type, dueAt }) => ({ type, dueAt }));
  const canManageRequirements = workspace.status !== "CLOSED" && actor.role !== "STUDENT";
  const canSubmit = workspace.status === "CONFIRMED" && actor.role !== "PROFESSOR" && submittableReports.length > 0;
  const earliestDueAt = workspace.schedule.executionStartsAt > now ? workspace.schedule.executionStartsAt : now;
  const nextReport = [...reportWorkspace.reports].filter((report) => report.dueAt >= now).sort((left, right) => left.dueAt.getTime() - right.dueAt.getTime())[0];
  const hasNoSubmittableReports = workspace.status === "CONFIRMED"
    && actor.role === "STUDENT"
    && reportWorkspace.reports.length > 0
    && submittableReports.length === 0;
  const emptyDescription = workspace.status === "CLOSED"
    ? "프로젝트 종료 전에 설정된 보고서 일정이 없습니다."
    : actor.role === "STUDENT"
      ? "지도교수가 보고서 종류와 마감을 정하면 여기에서 시작할 수 있습니다."
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

      {nextReport ? <aside aria-label="다음 보고서 기한" className="grid gap-2 border-b border-[var(--line)] pb-6 sm:grid-cols-[9rem_minmax(0,1fr)_auto] sm:items-center"><p className="text-xs font-extrabold text-[var(--accent-ink)]">다음 마감</p><strong className="text-lg">{reportTypeLabel[nextReport.type]}</strong><time className="font-bold text-[var(--accent-ink)]" dateTime={nextReport.dueAt.toISOString()}>{koreanDateTime.format(nextReport.dueAt)}</time></aside> : null}

      {hasNoSubmittableReports ? <ReportStatusStrip title="현재 제출 가능한 보고서가 없습니다" description="기존 제출·검토 이력은 아래에서 확인할 수 있습니다." /> : null}
      {workspace.status === "FORMING" ? <ReportStatusStrip title="팀 확정 후 제출할 수 있습니다" description="지도교수가 팀을 확정하면 제출 기간 내 보고서 버전을 등록할 수 있습니다." /> : workspace.status === "CLOSED" ? <ReportStatusStrip title="종료된 프로젝트입니다" description="새 보고서를 제출할 수 없으며 기존 제출·승인 이력만 확인할 수 있습니다." /> : null}
      {reportWorkspace.reports.length === 0 ? <EmptyState title="보고서 일정이 없습니다" description={emptyDescription} /> : (
        <div>
          <div className="hidden grid-cols-[9rem_minmax(0,1fr)_9rem_7rem] border-b border-[var(--line-strong)] px-2 pb-3 text-xs font-bold text-[var(--muted)] md:grid"><span>보고서</span><span>제출 이력</span><span>마감 기한</span><span className="text-right">관리</span></div>
          <div className="divide-y divide-[var(--line)] border-b border-[var(--line)]">
            {reportWorkspace.reports.map((report) => (
              <article key={report.type} className="grid gap-5 px-2 py-6 md:grid-cols-[9rem_minmax(0,1fr)_9rem_7rem]">
                <div><MobileFieldLabel>보고서</MobileFieldLabel><h2 className="font-extrabold">{reportTypeLabel[report.type]}</h2><p className="muted mt-1 text-xs">{report.versions.length}개 버전</p></div>
                <div>
                  <MobileFieldLabel>제출 이력</MobileFieldLabel>
                  {!report.versions.length ? <p className="muted text-sm">아직 제출된 버전이 없습니다.</p> : (
                    <ol className="relative border-l border-[var(--line)] pl-5">
                      {report.versions.map((version, index) => (
                        <li key={version.id} className="relative border-b border-[var(--line)] py-4 first:pt-0 last:border-b-0 last:pb-0">
                          <span aria-hidden="true" className={`absolute -left-[1.45rem] size-2 rounded-full bg-[var(--primary)] ${index === 0 ? "top-1" : "top-5"}`} />
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="min-w-0"><a href={`/api/files/${version.fileId}`} className="font-semibold text-[var(--primary-hover)] underline-offset-4 [overflow-wrap:anywhere] hover:underline">v{version.version} · {version.fileName}</a><p className="muted mt-1 text-xs">{version.submitterName} · {koreanDate.format(version.submittedAt)}</p></div>
                            {version.decision ? <StatusBadge tone={version.decision.decision === "APPROVED" ? "success" : "warning"}>{version.decision.decision === "APPROVED" ? "승인" : "수정 요청"}</StatusBadge> : <StatusBadge tone="neutral">{index === 0 ? "검토 대기" : "이전 버전"}</StatusBadge>}
                          </div>
                          {version.description ? <p className="mt-2 text-sm leading-6">{version.description}</p> : null}
                          {version.decision ? <p className="muted mt-2 text-sm">{version.decision.reviewerName} · {version.decision.comment || "의견 없음"}</p> : workspace.status === "CONFIRMED" && actor.role !== "STUDENT" && index === 0 ? <ReportDecisionForm teamId={workspace.id} reportVersionId={version.id} /> : null}
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
                <div><MobileFieldLabel>마감 기한</MobileFieldLabel><time className="text-sm font-semibold" dateTime={report.dueAt.toISOString()}>{koreanDate.format(report.dueAt)}</time></div>
                <div className="md:justify-self-end">{canManageRequirements ? <><MobileFieldLabel>관리</MobileFieldLabel><RemoveReportRequirementForm teamId={workspace.id} type={report.type} disabled={report.versions.length > 0} /></> : null}</div>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
