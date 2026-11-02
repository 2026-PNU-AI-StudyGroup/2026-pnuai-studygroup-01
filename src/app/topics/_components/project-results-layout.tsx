"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import {
  ProjectVoteStatusPill,
  useProjectVoteSelection,
  type ProjectVoteSelection,
} from "@/app/topics/_components/project-vote-control";
import { ProjectVoteResultsDialog } from "@/app/topics/_components/project-vote-results-dialog";
import { ProjectPagination } from "@/app/topics/_components/project-pagination";
import { cardClass } from "@/modules/project-program/ui/work-screen";
import type {
  ProgramVoteBallot,
  VotingResultsView,
} from "@/modules/project-voting/application/manage-project-voting";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiUl } from "@/modules/translation/ui/localized-elements";

export type ProjectResultsEmptyState = {
  unfilteredTitle: string;
  unfilteredDescription: string;
  filteredTitle?: string;
  filteredDescription: string;
};

export type ProjectColumn = { label: string; align?: "right" };

/*
  프로젝트 목록 한 장. 카드 대신 선과 줄 맞춤으로 읽는 표다. 첫 두 칸(사진, 프로젝트)은 늘 같고
  나머지 칸은 화면이 정한다. 목록 폭이 40rem 아래면 나머지 칸이 프로젝트 이름 밑으로 흘러 두 줄이 된다.
*/
export function ProjectResultsLayout<T>({
  title = "프로젝트",
  items,
  itemKey,
  total,
  page,
  totalPages,
  hasFilters,
  resetHref,
  emptyState,
  listLabel,
  paginationLabel,
  hrefForPage,
  renderItem,
  columns,
  columnTemplate,
  search,
  filters,
  ballot,
  votingResults,
}: {
  title?: string;
  items: T[];
  itemKey: (item: T) => string;
  total: number;
  page: number;
  totalPages: number;
  hasFilters: boolean;
  resetHref: string;
  emptyState: ProjectResultsEmptyState;
  listLabel: string;
  paginationLabel: string;
  hrefForPage: (page: number) => string;
  renderItem: (item: T, voteSelection: ProjectVoteSelection) => ReactNode;
  /** 사진, 프로젝트 칸 뒤에 오는 칸의 머리글. */
  columns: ProjectColumn[];
  /** 사진, 프로젝트 칸 뒤에 오는 칸들의 grid-template-columns 값. */
  columnTemplate: string;
  search?: ReactNode;
  filters?: ReactNode;
  ballot?: ProgramVoteBallot;
  votingResults?: VotingResultsView;
}) {
  const voteSelection = useProjectVoteSelection(ballot);
  const gridStyle = { "--row-cols": `2.5rem minmax(0,1fr) ${columnTemplate}` } as CSSProperties;
  return (
    <section id="project-results" aria-labelledby="project-results-title" className={`${cardClass} @container scroll-mt-32`}>
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 px-5 pb-3 pt-4">
        <h2 id="project-results-title" className="text-base font-semibold text-[var(--ink)]"><UiText>{title}</UiText></h2>
        <span className="text-[0.8125rem] tabular-nums text-[var(--muted)]">{total}<UiText>{"개"}</UiText><span className="sr-only"> <UiText>{listLabel}</UiText></span></span>
        <ProjectVoteStatusPill selection={voteSelection} />
        {votingResults ? <ProjectVoteResultsDialog view={votingResults} /> : null}
        {search ? <div className="w-full sm:ml-auto sm:w-64">{search}</div> : null}
      </div>
      {filters}
      {!items.length ? (
        <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-[var(--line)] px-5 py-4 text-[0.8125rem]">
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-[var(--ink)]"><UiText>{hasFilters ? emptyState.filteredTitle ?? "조건에 맞는 프로젝트가 없습니다" : emptyState.unfilteredTitle}</UiText></h3>
            <p className="mt-0.5 text-[var(--muted)]"><UiText>{hasFilters ? emptyState.filteredDescription : emptyState.unfilteredDescription}</UiText></p>
          </div>
          {hasFilters ? <Link href={resetHref} className="button-secondary button-compact"><UiText>{"필터 초기화"}</UiText></Link> : null}
        </div>
      ) : (
        <div style={gridStyle}>
          <div aria-hidden="true" className="hidden h-9 items-center gap-x-5 px-5 text-xs text-[var(--muted)] @min-[40rem]:grid @min-[40rem]:grid-cols-[var(--row-cols)] @min-[40rem]:gap-x-5">
            <span className="col-span-2"><UiText>{"프로젝트"}</UiText></span>
            {columns.map((column) => <span key={column.label} className={column.align === "right" ? "text-right" : undefined}><UiText>{column.label}</UiText></span>)}
          </div>
          <UiUl aria-label={listLabel}>
            {items.map((item) => (
              <li key={itemKey(item)} className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2 border-t border-[var(--line)] px-5 py-2.5 transition-colors hover:bg-[#fafbfc] @min-[40rem]:grid-cols-[var(--row-cols)] @min-[40rem]:gap-x-5">
                {renderItem(item, voteSelection)}
              </li>
            ))}
          </UiUl>
        </div>
      )}
      <ProjectPagination
        page={page}
        totalPages={totalPages}
        ariaLabel={paginationLabel}
        href={hrefForPage}
      />
    </section>
  );
}

/** 행의 프로젝트 칸. 이름(링크)과 그 아래 한 줄 설명. */
export function ProjectIdentity({ id, title, href, description }: {
  id: string;
  title: string;
  href: string;
  description: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <h3 id={id} className="truncate text-sm font-medium leading-5">
        <Link href={href} className="text-[var(--ink)] hover:text-[var(--primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"><UiText>{title}</UiText></Link>
      </h3>
      <p className="mt-0.5 truncate text-[0.8125rem] leading-[1.125rem] text-[var(--muted)]">{description}</p>
    </div>
  );
}

/** 행의 나머지 칸 묶음. 넓은 화면에서는 사라져 칸마다 격자에 앉고, 좁은 화면에서는 이름 밑 한 줄로 흐른다. */
export function ProjectRowCells({ children }: { children: ReactNode }) {
  return <div className="col-start-2 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 text-[0.8125rem] @min-[40rem]:contents">{children}</div>;
}
