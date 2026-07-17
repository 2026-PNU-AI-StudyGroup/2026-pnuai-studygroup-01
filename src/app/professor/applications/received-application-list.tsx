import Link from "next/link";

import type { ProfessorTopicApplicationSummary } from "@/modules/topic-application/application/topic-application-ports";
import { StatusBadge } from "@/shared/ui/page-primitives";

const statusPresentation = {
  PENDING: ["검토 중", "info"],
  ACCEPTED: ["수락", "success"],
  REJECTED: ["거절", "danger"],
} as const;

const dateTime = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function ReceivedApplicationList({
  applications,
}: {
  applications: ProfessorTopicApplicationSummary[];
}) {
  return (
    <section aria-label="지원서 목록">
      <div className="flex items-center gap-4 border-y border-[var(--line)] py-4 text-sm">
        <StatusBadge tone="info">
          검토 대기 {applications.filter((item) => item.status === "PENDING").length}
        </StatusBadge>
        <span className="muted">전체 {applications.length}</span>
      </div>
      <ul className="divide-y divide-[var(--line)]">
        {applications.map((application) => (
          <li
            key={application.id}
            className="grid gap-5 py-7 md:grid-cols-[minmax(0,1fr)_12rem_auto] md:items-center"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={statusPresentation[application.status][1]}>
                  {statusPresentation[application.status][0]}
                </StatusBadge>
                <span className="muted text-xs">희망 역할 · {application.desiredRole || "미입력"}</span>
              </div>
              <h2 className="mt-3 truncate text-lg font-extrabold tracking-[-0.025em]">
                {application.topicTitle}
              </h2>
            </div>
            <div className="min-w-0 text-sm">
              <p className="truncate font-bold">{application.studentName}</p>
              <p className="muted mt-1 truncate text-xs">{application.studentEmail}</p>
              <p className="muted mt-2 text-xs">
                <time dateTime={application.createdAt.toISOString()}>
                  {dateTime.format(application.createdAt)} 지원
                </time>
              </p>
            </div>
            <Link
              href={`/professor/applications/${application.id}`}
              className="button-secondary justify-center text-sm"
              aria-label={`${application.studentName}의 ${application.topicTitle} 지원서 상세 보기`}
            >
              상세 보기
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
