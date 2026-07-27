import { UiDate } from "@/modules/translation/ui/i18n-provider";
import { UiLink } from "@/modules/translation/ui/localized-elements";
import { UiSection } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";

import type { ProfessorTopicApplicationSummary } from "@/modules/topic-application/application/topic-application-ports";
import { StatusBadge } from "@/shared/ui/page-primitives";

const statusPresentation = {
  PENDING: ["검토 중", "info"],
  ACCEPTED: ["수락", "success"],
  REJECTED: ["거절", "danger"],
} as const;

export function ReceivedApplicationList({
  applications,
}: {
  applications: ProfessorTopicApplicationSummary[];
}) {
  return (
    <UiSection aria-label="지원서 목록">
      <div className="flex items-center gap-4 border-y border-[var(--line)] py-4 text-sm">
        <StatusBadge tone="info">
          <UiText>{"검토 대기"}</UiText>{applications.filter((item) => item.status === "PENDING").length}
        </StatusBadge>
        <span className="muted"><UiText>{"전체"}</UiText>{" "}{applications.length}</span>
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
                <span className="muted text-xs"><UiText>{application.applicationKind === "TEAM" ? `팀 지원 · ${application.teamMembers.length}명` : "개인 지원"}</UiText></span>
              </div>
              <h2 className="mt-3 truncate text-lg font-semibold tracking-[-0.025em]">
                <UiText>{application.topicTitle}</UiText>
              </h2>
            </div>
            <div className="min-w-0 text-sm">
              <p className="truncate font-bold">{application.studentName}<UiText>{application.applicationKind === "TEAM" ? " 외 팀원" : ""}</UiText></p>
              <p className="muted mt-1 truncate text-xs">{application.studentEmail}</p>
              <p className="muted mt-2 text-xs">
                <time dateTime={application.createdAt.toISOString()}>
                  <UiDate value={application.createdAt} mode="dateTime" /> <UiText>{"지원"}</UiText></time>
              </p>
            </div>
            <UiLink
              href={`/professor/applications/${application.id}`}
              className="button-secondary justify-center text-sm"
              aria-label={`${application.studentName}의 ${application.topicTitle} 지원서 상세 보기`}
            >
              <UiText>{"상세 보기"}</UiText></UiLink>
          </li>
        ))}
      </ul>
    </UiSection>
  );
}
