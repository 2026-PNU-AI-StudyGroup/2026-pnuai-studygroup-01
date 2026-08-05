import Link from "next/link";
import { UiDate } from "@/modules/translation/ui/i18n-provider";
import { UiLink } from "@/modules/translation/ui/localized-elements";
import { UiInput, UiNav, UiSection, UiUl } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";

import type {
  ProfessorTopicApplicationPage,
  ProfessorTopicApplicationStatus,
} from "@/modules/topic-application/application/topic-application-ports";
import { topicApplicationStatusPresentation } from "@/modules/topic-application/ui/topic-application-status-presentation";
import { EmptyState, StatusBadge } from "@/shared/ui/page-primitives";

function applicationsHref({ page = 1, status, query }: {
  page?: number;
  status?: ProfessorTopicApplicationStatus;
  query: string;
}) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (status) params.set("status", status);
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `/professor/applications?${search}` : "/professor/applications";
}

const statusFilters = [
  { value: undefined, label: "전체" },
  { value: "PENDING", label: "검토 중" },
  { value: "ACCEPTED", label: "선정" },
  { value: "REJECTED", label: "미선정" },
] as const satisfies ReadonlyArray<{ value: ProfessorTopicApplicationStatus | undefined; label: string }>;

export function ReceivedApplicationList({
  page,
  status,
  query,
}: {
  page: ProfessorTopicApplicationPage;
  status?: ProfessorTopicApplicationStatus;
  query: string;
}) {
  const allCount = Object.values(page.counts).reduce((sum, count) => sum + count, 0);

  return (
    <UiSection aria-label="지원서 목록" className="space-y-5">
      <div className="rounded-[var(--radius-panel)] border border-[var(--line)] bg-white p-5 sm:p-6">
        <form action="/professor/applications" method="get" role="search" className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          {status ? <input type="hidden" name="status" value={status} /> : null}
          <label className="grid gap-2 text-sm font-bold">
            <UiText>{"주제 또는 지원자 검색"}</UiText>
            <UiInput
              type="search"
              name="q"
              defaultValue={query}
              maxLength={100}
              className="field"
              placeholder="주제명, 지원자 이름 또는 이메일"
            />
          </label>
          <button type="submit" className="button-primary max-sm:w-full"><UiText>{"검색"}</UiText></button>
        </form>

        <UiNav aria-label="지원 상태 필터" className="mt-5 overflow-x-auto border-t border-[var(--line)] pt-4">
          <ul className="flex min-w-max gap-2">
            {statusFilters.map((filter) => {
              const selected = filter.value === status;
              const count = filter.value ? page.counts[filter.value] : allCount;
              return (
                <li key={filter.value ?? "ALL"}>
                  <Link
                    href={applicationsHref({ status: filter.value, query })}
                    aria-current={selected ? "page" : undefined}
                    className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-bold transition-colors ${
                      selected
                        ? "border-[var(--primary)] bg-[var(--primary-subtle)] text-[var(--primary-hover)]"
                        : "border-[var(--line-strong)] bg-white text-[var(--muted)] hover:text-[var(--ink)]"
                    }`}
                  >
                    <UiText>{filter.label}</UiText><span aria-hidden="true">{count}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </UiNav>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-y border-[var(--line)] py-4 text-sm">
        <span className="font-bold"><UiText>{"검색 결과"}</UiText>{" "}{page.total}<UiText>{"건"}</UiText></span>
        <span className="muted"><UiText>{"검토 중"}</UiText>{" "}{page.counts.PENDING}<UiText>{"건"}</UiText></span>
      </div>

      {page.items.length === 0 ? (
        <EmptyState
          title="조건에 맞는 지원서가 없습니다"
          description="검색어나 지원 상태를 바꿔 다시 확인해 주세요."
          action={<Link href="/professor/applications" className="button-secondary"><UiText>{"필터 초기화"}</UiText></Link>}
        />
      ) : <UiUl aria-label="지원서 결과" className="divide-y divide-[var(--line)]">
        {page.items.map((application) => (
          <li
            key={application.id}
            className="grid gap-5 py-7 md:grid-cols-[minmax(0,1fr)_12rem_auto] md:items-center"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={topicApplicationStatusPresentation[application.status].tone}>
                  {topicApplicationStatusPresentation[application.status].label}
                </StatusBadge>
                <span className="muted text-xs"><UiText>{application.applicationKind === "TEAM" ? `팀 지원 · ${application.teamMemberCount}명` : "개인 지원"}</UiText></span>
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
      </UiUl>}

      {page.totalPages > 1 ? (
        <UiNav aria-label="지원서 페이지" className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-5">
          <span className="muted text-sm">{page.page} / {page.totalPages} <UiText>{"페이지"}</UiText></span>
          <div className="flex gap-2">
            {page.page > 1 ? <Link className="button-quiet" href={applicationsHref({ page: page.page - 1, status, query })}><UiText>{"이전"}</UiText></Link> : null}
            {page.page < page.totalPages ? <Link className="button-quiet" href={applicationsHref({ page: page.page + 1, status, query })}><UiText>{"다음"}</UiText></Link> : null}
          </div>
        </UiNav>
      ) : null}
    </UiSection>
  );
}
