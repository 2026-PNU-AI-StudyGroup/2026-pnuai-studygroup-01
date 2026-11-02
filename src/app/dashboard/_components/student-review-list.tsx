import Link from "next/link";

import { TopicApprovalDialog } from "@/app/_components/topic-approval-dialog";
import { StudentRegistrationWithdrawalForm } from "@/app/dashboard/_components/student-registration-withdrawal-form";
import { UiDate, UiText } from "@/modules/translation/ui/i18n-provider";
import type { TopicApplicationSummary } from "@/modules/topic-application/application/topic-application-ports";
import type { TopicApprovalRequestSummary } from "@/modules/topic-approval/application/manage-topic-approvals";
import { EmptyState, StatusBadge } from "@/shared/ui/page-primitives";
import { ProjectPagination } from "@/shared/ui/project-pagination";

type ApplicationReviewEntry = {
  id: string;
  type: "APPLICATION";
  title: string;
  programName: string;
  createdAt: Date;
  href: string | null;
  actionLabel: string;
};

type RegistrationReviewEntry = {
  id: string;
  type: "REGISTRATION";
  title: string;
  programName: string;
  createdAt: Date;
  request: TopicApprovalRequestSummary;
};

type ReviewEntry = ApplicationReviewEntry | RegistrationReviewEntry;

function isApplicationPublic(application: TopicApplicationSummary) {
  return application.topicStatus === "ACTIVE" && application.programStatus === "OPEN";
}

function reviewEntries(
  applications: TopicApplicationSummary[],
  registrations: TopicApprovalRequestSummary[],
): ReviewEntry[] {
  return [
    ...applications.map((application): ApplicationReviewEntry => ({
      id: `application-${application.id}`,
      type: "APPLICATION",
      title: application.topicTitle,
      programName: application.programName,
      createdAt: application.createdAt,
      href: isApplicationPublic(application) ? `/topics/${application.topicId}` : null,
      actionLabel: "프로젝트 보기",
    })),
    ...registrations.map((registration): RegistrationReviewEntry => ({
      id: `registration-${registration.id}`,
      type: "REGISTRATION",
      title: registration.topicTitle,
      programName: registration.programName,
      createdAt: registration.createdAt,
      request: registration,
    })),
  ].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime() || left.id.localeCompare(right.id));
}

export function StudentReviewList({
  applications,
  registrations,
  total: totalOverride,
  page = 1,
  pageSize = 20,
  preview = false,
}: {
  applications: TopicApplicationSummary[];
  registrations: TopicApprovalRequestSummary[];
  total?: number;
  page?: number;
  pageSize?: number;
  preview?: boolean;
}) {
  const entries = reviewEntries(applications, registrations);
  if (preview && entries.length === 0) return null;
  const total = totalOverride ?? entries.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const resolvedPage = Math.min(Math.max(page, 1), totalPages);
  const visibleEntries = preview
    ? entries.slice(0, 3)
    : entries.slice((resolvedPage - 1) * pageSize, resolvedPage * pageSize);

  return (
    <section aria-labelledby="student-review-title" className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface)]">
      <header className="flex items-baseline gap-2.5 px-5 pb-2.5 pt-4">
        <h2 id="student-review-title" className="text-base font-semibold"><UiText>{"검토 중"}</UiText></h2>
        <span className="text-[0.8125rem] tabular-nums text-[var(--muted)]">{total}<UiText>{"건"}</UiText></span>
      </header>

      {visibleEntries.length > 0 ? (
        <ul className="divide-y divide-[var(--line)] border-t border-[var(--line)]">
          {visibleEntries.map((entry) => {
            const titleId = `student-review-${entry.id}-title`;
            const actionId = `student-review-${entry.id}-action`;
            return (
              <li key={entry.id} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone="info"><UiText>{"검토 중"}</UiText></StatusBadge>
                    <span className="text-xs font-semibold text-[var(--muted)]"><UiText>{entry.type === "APPLICATION" ? "프로젝트 지원" : "프로젝트 등록"}</UiText></span>
                  </div>
                  <h3 id={titleId} className="mt-1.5 text-sm font-medium leading-5"><UiText>{entry.title}</UiText></h3>
                  <p className="text-xs text-[var(--muted)]"><UiText>{entry.programName}</UiText></p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <time className="text-xs tabular-nums text-[var(--muted)]" dateTime={entry.createdAt.toISOString()}><UiDate value={entry.createdAt} mode="date" /></time>
                  {entry.type === "REGISTRATION" ? (
                    <div className="flex items-center gap-2">
                      <TopicApprovalDialog request={entry.request} canDecide={false} triggerLabel="보기" />
                      <StudentRegistrationWithdrawalForm projectId={entry.request.topicId} />
                    </div>
                  ) : entry.href ? (
                    <Link href={entry.href} aria-labelledby={`${titleId} ${actionId}`} className="button-secondary button-compact"><span id={actionId}><UiText>{entry.actionLabel}</UiText></span></Link>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="border-t border-[var(--line)] px-5"><EmptyState variant="section" title="검토 중인 요청이 없습니다" description="새 프로젝트를 찾거나 프로젝트를 등록하면 이곳에서 상태를 확인할 수 있습니다." action={<Link href="/topics" className="button-secondary"><UiText>{"프로젝트 목록"}</UiText></Link>} /></div>
      )}

      {preview && total > visibleEntries.length ? (
        <div className="border-t border-[var(--line)] px-5 py-2.5"><Link href="/dashboard?view=pending" className="text-[0.8125rem] font-medium text-[var(--primary)] hover:underline hover:underline-offset-[3px]"><UiText>{"검토 중 전체 보기"}</UiText></Link></div>
      ) : null}
      {!preview ? <ProjectPagination page={resolvedPage} totalPages={totalPages} ariaLabel="검토 중 페이지" href={(nextPage) => `/dashboard?view=pending&page=${nextPage}`} /> : null}
    </section>
  );
}
