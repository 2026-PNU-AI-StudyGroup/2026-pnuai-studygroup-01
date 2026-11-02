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
import { cardClass, Pill } from "@/modules/project-program/ui/work-screen";
import { PaginationDirectionLink } from "@/shared/ui/icon-button";
import { SearchIcon } from "@/shared/ui/workspace-icons";

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

// 검토 중은 파랑(할 일), 선정은 초록, 미선정은 옅은 빨강, 철회는 회색.
const statusTone = { PENDING: "accent", ACCEPTED: "success", REJECTED: "danger", WITHDRAWN: "plain" } as const;

// 지원자, 프로젝트, 지원일, 상태, 다음 할 일. 목록 폭이 44rem 아래면 프로젝트와 날짜가 이름 밑으로 흐른다.
const rowGrid = "@min-[44rem]:grid-cols-[minmax(0,13rem)_minmax(0,1fr)_7.5rem_4.5rem_3rem]";

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
  const filtered = Boolean(status || query);

  return (
    <UiSection aria-label="지원서 목록" className={`${cardClass} @container`}>
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 px-5 pb-1 pt-4">
        <h2 className="text-base font-semibold text-[var(--ink)]"><UiText>{"받은 지원서"}</UiText></h2>
        <span className="text-[0.8125rem] tabular-nums text-[var(--muted)]">{page.total}<UiText>{"건"}</UiText></span>
        <form action="/professor/applications" method="get" role="search" className="relative w-full sm:ml-auto sm:w-72">
          {status ? <input type="hidden" name="status" value={status} /> : null}
          <label htmlFor="application-search" className="sr-only"><UiText>{"프로젝트 또는 지원자 검색"}</UiText></label>
          <SearchIcon aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]" />
          <UiInput
            id="application-search"
            type="search"
            name="q"
            defaultValue={query}
            maxLength={100}
            className="form-control min-h-[2.125rem] py-1 pl-9 text-[0.8125rem]"
            placeholder="프로젝트명, 지원자 이름 또는 이메일"
          />
        </form>
      </div>

      {/* 상태 탭. 전체 폭 1px 선 위에 놓고, 고른 탭만 2px 밑줄을 단다. */}
      <UiNav aria-label="지원 상태 필터" className="overflow-x-auto border-b border-[var(--line)] px-5">
        <ul className="flex min-w-max gap-5">
          {statusFilters.map((filter) => {
            const selected = filter.value === status;
            const count = filter.value ? page.counts[filter.value] : allCount;
            return (
              <li key={filter.value ?? "ALL"}>
                <Link
                  href={applicationsHref({ status: filter.value, query })}
                  aria-current={selected ? "page" : undefined}
                  className={`-mb-px inline-flex h-10 items-center gap-1.5 border-b-2 text-sm transition-colors ${
                    selected
                      ? "border-[var(--primary)] font-medium text-[var(--ink)]"
                      : "border-transparent text-[var(--muted)] hover:text-[var(--ink)]"
                  }`}
                >
                  <UiText>{filter.label}</UiText><span aria-hidden="true" className="tabular-nums">{count}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </UiNav>

      {page.items.length === 0 ? (
        <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-4 text-[0.8125rem]">
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-[var(--ink)]"><UiText>{filtered ? "조건에 맞는 지원서가 없습니다" : "아직 받은 지원서가 없습니다"}</UiText></h3>
            <p className="mt-0.5 text-[var(--muted)]"><UiText>{filtered ? "검색어나 지원 상태를 바꿔 다시 확인해 주세요." : "학생이 프로젝트에 지원하면 이 목록에 표시됩니다."}</UiText></p>
          </div>
          {filtered ? <Link href="/professor/applications" className="button-secondary button-compact"><UiText>{"필터 초기화"}</UiText></Link> : null}
        </div>
      ) : (
        <>
          <div aria-hidden="true" className={`hidden h-9 items-center gap-x-4 px-5 text-xs text-[var(--muted)] @min-[44rem]:grid ${rowGrid}`}>
            <span><UiText>{"지원자"}</UiText></span>
            <span><UiText>{"프로젝트"}</UiText></span>
            <span className="text-right"><UiText>{"지원일"}</UiText></span>
            <span><UiText>{"상태"}</UiText></span>
            <span />
          </div>
          <UiUl aria-label="지원서 결과">
            {page.items.map((application, index) => {
              const presentation = topicApplicationStatusPresentation[application.status];
              const team = application.applicationKind === "TEAM";
              return (
                <li
                  key={application.id}
                  className={`group relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-5 py-2.5 transition-colors hover:bg-[#fafbfc] ${index === 0 ? "" : "border-t border-[var(--line)]"} ${rowGrid}`}
                >
                  <div className="min-w-0 leading-5">
                    <p className="truncate text-sm font-medium text-[var(--ink)]">{application.studentName}<UiText>{team && application.teamMemberCount > 1 ? ` 외 ${application.teamMemberCount - 1}명` : ""}</UiText></p>
                    <p className="truncate text-xs text-[var(--muted)]"><UiText>{team ? `팀 지원, ${application.teamMemberCount}명` : "개인 지원"}</UiText></p>
                  </div>
                  {/* 좁으면 상태 알약이 이름 오른쪽에 붙고, 프로젝트와 지원일이 그 밑 한 줄에 놓인다. */}
                  <h3 className="truncate text-[0.8125rem] text-[var(--ink)] group-hover:text-[var(--primary)]">
                    <UiText>{application.topicTitle}</UiText>
                  </h3>
                  <time dateTime={application.createdAt.toISOString()} className="whitespace-nowrap text-right text-xs tabular-nums text-[var(--muted)] @min-[44rem]:text-[0.8125rem]">
                    <UiDate value={application.createdAt} mode="dateTime" />
                  </time>
                  <span className="col-start-2 row-start-1 @min-[44rem]:col-start-auto @min-[44rem]:row-start-auto"><Pill tone={statusTone[application.status]}>{presentation.label}</Pill></span>
                  <span aria-hidden="true" className="hidden justify-self-end whitespace-nowrap text-[0.8125rem] font-medium text-[var(--primary)] @min-[44rem]:inline">
                    <UiText>{application.status === "PENDING" ? "검토" : "보기"}</UiText>
                  </span>
                  <UiLink
                    href={`/professor/applications/${application.id}`}
                    className="absolute inset-0 z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--primary)]"
                    aria-label={`${application.studentName}의 ${application.topicTitle} 지원서 상세 보기`}
                  />
                </li>
              );
            })}
          </UiUl>
        </>
      )}

      {page.totalPages > 1 ? (
        <UiNav aria-label="지원서 페이지" className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] px-5 py-3">
          <span className="text-[0.8125rem] tabular-nums text-[var(--muted)]">{page.page} / {page.totalPages} <UiText>{"페이지"}</UiText></span>
          <div className="flex gap-2">
            {page.page > 1 ? <PaginationDirectionLink direction="previous" href={applicationsHref({ page: page.page - 1, status, query })} /> : null}
            {page.page < page.totalPages ? <PaginationDirectionLink direction="next" href={applicationsHref({ page: page.page + 1, status, query })} /> : null}
          </div>
        </UiNav>
      ) : null}
    </UiSection>
  );
}
