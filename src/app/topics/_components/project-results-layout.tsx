"use client";

import Link from "next/link";
import type { ReactNode } from "react";

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

/*
  프로젝트 목록. 큰 대표 이미지를 얹은 카드를 목록 폭에 따라 3, 2, 1열로 흘린다.
  카드는 행마다 높이를 맞추고 버튼 줄을 바닥에 붙인다.
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
  search?: ReactNode;
  filters?: ReactNode;
  ballot?: ProgramVoteBallot;
  votingResults?: VotingResultsView;
}) {
  const voteSelection = useProjectVoteSelection(ballot);
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
        <UiUl aria-label={listLabel} className="grid grid-cols-1 gap-4 border-t border-[var(--line)] p-5 @min-[30rem]:grid-cols-2 @min-[44rem]:grid-cols-3">
          {items.map((item) => (
            <li key={itemKey(item)} className="group flex min-w-0 flex-col overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] bg-[var(--surface)] transition-colors hover:border-[var(--line-strong)] focus-within:border-[var(--line-strong)]">
              {renderItem(item, voteSelection)}
            </li>
          ))}
        </UiUl>
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

/**
 * 목록 카드 한 장의 속. 위에 16:10 대표 이미지, 아래에 이름, 설명, 팀, 알약, 버튼 줄.
 * 이미지가 없으면 옅은 파랑 판에 프로그램 아이콘만 작게 둔다.
 */
export function ProjectCard({ id, title, href, description, image, fallback, meta, badges, actions }: {
  id: string;
  title: string;
  href: string;
  description: ReactNode;
  image?: string | null;
  fallback: ReactNode;
  meta?: ReactNode;
  badges?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <>
      <div className="aspect-[16/10] overflow-hidden border-b border-[var(--line)] bg-[var(--surface-subtle)]">
        {image ? (
          // /api/files 는 로그인 쿠키를 요구해 이미지 최적화를 거치지 않는다.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" loading="lazy" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
        ) : (
          <span aria-hidden="true" className="grid size-full place-items-center bg-[var(--accent-subtle)] text-[var(--accent-ink)] [&>svg]:size-9 [&>svg]:opacity-60">{fallback}</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-3.5">
        <div className="min-w-0">
          <h3 id={id} className="line-clamp-2 text-[0.9375rem] font-semibold leading-snug">
            <Link href={href} className="rounded-sm text-[var(--ink)] group-hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"><UiText>{title}</UiText></Link>
          </h3>
          <p className="mt-1 truncate text-xs text-[var(--muted)]">{description}</p>
        </div>
        {meta ? <div className="min-w-0 text-[0.8125rem]">{meta}</div> : null}
        {badges ? <div className="flex flex-wrap items-center gap-1.5 empty:hidden">{badges}</div> : null}
        {/* 버튼은 내용 크기의 낮은 버튼. 휴대폰 폭 한 열에서만 꽉 채운다. */}
        <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-[var(--line)] pt-3 empty:hidden [&_.button-compact]:min-h-8 [&_.button-compact]:w-auto [&_.button-compact]:px-3 [&_.button-compact]:font-medium @max-[30rem]:[&_.button-compact]:flex-1">{actions}</div>
      </div>
    </>
  );
}
