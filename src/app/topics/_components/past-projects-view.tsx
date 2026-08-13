"use client";

import Link from "next/link";
import { UiSection } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";

import { ProjectGalleryCover } from "@/app/topics/_components/project-gallery-cover";
import { AdminProjectCardActions } from "@/app/topics/_components/admin-project-card-actions";
import { ProjectPagination } from "@/app/topics/_components/project-pagination";
import { ProjectVoteButton, ProjectVoteCountBadge, ProjectVoteStatusPill, useProjectVoteSelection } from "@/app/topics/_components/project-vote-control";
import { ProjectVoteResultsDialog } from "@/app/topics/_components/project-vote-results-dialog";
import styles from "@/app/topics/_components/project-gallery.module.css";
import type { ArchivedProject } from "@/modules/team/application/archive-projects";
import type { ProgramVoteBallot, ProgramVotingResults } from "@/modules/project-voting/application/manage-project-voting";
import type { AdminProjectCardData } from "@/modules/team/application/list-admin-project-card-data";
import { EmptyState } from "@/shared/ui/page-primitives";
import { UndoIcon } from "@/shared/ui/workspace-icons";

function pastHref({ query, programId, page }: {
  query?: string;
  programId?: string;
  page?: number;
}) {
  const target = new URLSearchParams({ view: "past" });
  if (query) target.set("q", query);
  if (programId) target.set("programId", programId);
  if (page && page > 1) target.set("page", String(page));
  return `/topics?${target.toString()}`;
}

export function PastProjectsView({ projects, total, page, totalPages, query, programId, ballot, votingResults, adminProjectData }: {
  projects: ArchivedProject[];
  total: number;
  page: number;
  totalPages: number;
  query: string;
  programId?: string;
  ballot?: ProgramVoteBallot;
  votingResults?: ProgramVotingResults;
  adminProjectData?: AdminProjectCardData[];
}) {
  const hasFilters = Boolean(query || programId);
  const voteSelection = useProjectVoteSelection(ballot);
  const adminDataByTopicId = new Map(adminProjectData?.map((data) => [data.topicId, data]));
  return (
    <div className="min-w-0">
      {hasFilters && projects.length > 0 ? <UiSection aria-label="지난 프로젝트 검색" className="pt-5">
        <div className="mb-2 flex justify-end"><Link className="text-xs font-bold text-[var(--primary)]" href={pastHref({})}><UiText>{"조건 초기화"}</UiText></Link></div>
      </UiSection> : null}

      <section aria-labelledby="past-list-title" className="pt-5">
        <div className="mb-4 flex min-h-8 items-center gap-3">
          <ProjectVoteStatusPill selection={voteSelection} />
          {votingResults ? <ProjectVoteResultsDialog results={votingResults} /> : null}
          <h2 id="past-list-title" className="sr-only"><UiText>{"지난 프로젝트 목록"}</UiText></h2>
          <p className="ml-auto text-xs font-semibold text-[var(--muted)]"><UiText>{"총"}</UiText>{" "}<strong className="text-[var(--ink)]">{total}</strong><UiText>{"개"}</UiText></p>
        </div>
        {projects.length === 0 ? (
          <EmptyState
            title={hasFilters ? "조건에 맞는 프로젝트가 없습니다" : "아직 지난 프로젝트가 없습니다"}
            description={hasFilters ? "검색어나 프로그램을 바꿔 다시 확인해 주세요." : "완료된 프로젝트가 생기면 이 목록에서 확인할 수 있습니다."}
            action={hasFilters ? <Link href={pastHref({})} className="button-secondary gap-2"><UndoIcon className="size-4 shrink-0" /><UiText>{"필터 초기화"}</UiText></Link> : undefined}
          />
        ) : (
          <>
            <ol className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
              {projects.map((project) => {
                const href = `/topics/archive/${project.id}`;
                const voteCandidate = voteSelection.ballot?.candidates.find(({ id }) => id === project.topicId);
                const cardData = adminDataByTopicId.get(project.topicId);

                return (
                  <li key={project.id} className="min-w-0">
                    <article aria-labelledby={`past-project-${project.id}`} className={styles.card}>
                      <div className="relative">
                        <ProjectGalleryCover imagePath={project.thumbnailPath} programName={project.programName} title={project.topicTitle} />
                        {voteCandidate ? <ProjectVoteCountBadge voteCount={voteCandidate.voteCount} /> : null}
                      </div>
                      <div className={styles.body}>
                        <h3 id={`past-project-${project.id}`} className="line-clamp-2 min-w-0 text-xl font-bold leading-7 tracking-[-0.03em]">
                          <Link href={href} className={styles.titleLink}><UiText>{project.topicTitle}</UiText></Link>
                        </h3>
                        <p className="mt-2 text-xs font-semibold text-[var(--primary)]"><UiText>{`${project.programName} · ${project.divisionName ?? "미분과"}`}</UiText></p>
                        <p className="mt-2 truncate text-xs font-semibold text-[var(--muted)]">
                          <span className="text-[var(--ink)]">{project.teamName} <UiText>{"팀"}</UiText></span>
                          {project.advisorEnabled ? <>{" · "}{project.professorName} <UiText>{project.advisorRole}</UiText></> : null}
                        </p>
                        <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--muted)]"><UiText>{project.topicDescription}</UiText></p>
                        {adminProjectData !== undefined || voteCandidate ? (
                          <div className={`mt-auto pt-5 ${styles.actionLayer}`}>
                            {adminProjectData !== undefined ? (
                              <AdminProjectCardActions projectTitle={project.topicTitle} data={cardData} />
                            ) : null}
                            {voteCandidate ? (
                              <div className={adminProjectData !== undefined ? "mt-2" : ""}>
                                <ProjectVoteButton candidate={voteCandidate} selection={voteSelection} />
                              </div>
                            ) : null}
                          </div>
                        ) : null}

                      </div>
                    </article>
                  </li>
                );
              })}
            </ol>
            <ProjectPagination
              page={page}
              totalPages={totalPages}
              ariaLabel="지난 프로젝트 페이지"
              href={(targetPage) => pastHref({ query, programId, page: targetPage })}
            />
          </>
        )}
      </section>
    </div>
  );
}
