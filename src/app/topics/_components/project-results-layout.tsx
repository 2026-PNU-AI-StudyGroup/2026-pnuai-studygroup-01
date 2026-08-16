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
import type {
  ProgramVoteBallot,
  VotingResultsView,
} from "@/modules/project-voting/application/manage-project-voting";
import { UiText } from "@/modules/translation/ui/i18n-provider";
import { UiUl } from "@/modules/translation/ui/localized-elements";
import { EmptyState } from "@/shared/ui/page-primitives";
import { DocumentIcon, UndoIcon } from "@/shared/ui/workspace-icons";

const cardGridClassName = "grid gap-5 md:grid-cols-2 2xl:grid-cols-3";

export type ProjectResultsEmptyState = {
  unfilteredTitle: string;
  unfilteredDescription: string;
  filteredTitle?: string;
  filteredDescription: string;
};

export function ProjectResultsLayout<T>({
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
  headerAction,
  ballot,
  votingResults,
  showSubmissionManagement,
}: {
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
  headerAction?: ReactNode;
  ballot?: ProgramVoteBallot;
  votingResults?: VotingResultsView;
  showSubmissionManagement?: boolean;
}) {
  const voteSelection = useProjectVoteSelection(ballot);
  return (
    <section id="project-results" aria-labelledby="project-results-title" className="scroll-mt-32 pt-5">
      <div className="mb-4 flex min-h-9 flex-wrap items-center gap-3">
        {headerAction}
        <ProjectVoteStatusPill selection={voteSelection} />
        {votingResults ? <ProjectVoteResultsDialog view={votingResults} /> : null}
        {showSubmissionManagement ? <button type="button" className="button-secondary min-h-8 gap-1.5 px-3 py-1.5 text-xs" disabled><DocumentIcon className="size-4 shrink-0" /><UiText>{"제출물 관리"}</UiText></button> : null}
        <h2 id="project-results-title" className="sr-only"><UiText>{listLabel}</UiText></h2>
        <p className="ml-auto shrink-0 text-xs font-semibold text-[var(--muted)]">
          <UiText>{"총"}</UiText>{" "}<strong className="text-[var(--ink)]">{total}</strong><UiText>{"개"}</UiText>
        </p>
      </div>
      {!items.length ? (
        <EmptyState
          title={hasFilters ? emptyState.filteredTitle ?? "조건에 맞는 프로젝트가 없습니다" : emptyState.unfilteredTitle}
          description={hasFilters ? emptyState.filteredDescription : emptyState.unfilteredDescription}
          action={hasFilters ? (
            <Link href={resetHref} className="button-secondary gap-2">
              <UndoIcon className="size-4 shrink-0" />
              <UiText>{"필터 초기화"}</UiText>
            </Link>
          ) : undefined}
        />
      ) : (
        <UiUl aria-label={listLabel} className={cardGridClassName}>
          {items.map((item) => <li key={itemKey(item)} className="min-w-0">{renderItem(item, voteSelection)}</li>)}
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
