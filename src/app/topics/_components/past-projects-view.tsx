"use client";

import Link from "next/link";
import { UiNav, UiSection } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";

import { ProjectGalleryCover } from "@/app/topics/_components/project-gallery-cover";
import { ProjectPagination } from "@/app/topics/_components/project-pagination";
import { ProjectSearchForm } from "@/app/topics/_components/project-search-form";
import { ProjectVoteButton, ProjectVoteStatusPanel, useProjectVoteSelection } from "@/app/topics/_components/project-vote-control";
import styles from "@/app/topics/_components/project-gallery.module.css";
import type { ArchivedProject } from "@/modules/team/application/archive-projects";
import type { ProgramVoteBallot } from "@/modules/project-voting/application/manage-project-voting";
import { EmptyState } from "@/shared/ui/page-primitives";

function pastHref({ query, programId, divisionId, page }: {
  query?: string;
  programId?: string;
  divisionId?: string | "UNASSIGNED";
  page?: number;
}) {
  const target = new URLSearchParams({ view: "past" });
  if (query) target.set("q", query);
  if (programId) target.set("programId", programId);
  if (divisionId) target.set("divisionId", divisionId);
  if (page && page > 1) target.set("page", String(page));
  return `/topics?${target.toString()}`;
}

export function PastProjectsView({ projects, total, page, totalPages, query, programId, divisionId, divisions = [], hasUnassigned = false, ballot }: {
  projects: ArchivedProject[];
  total: number;
  page: number;
  totalPages: number;
  query: string;
  programId?: string;
  divisionId?: string | "UNASSIGNED";
  divisions?: Array<{ id: string; name: string }>;
  hasUnassigned?: boolean;
  ballot?: ProgramVoteBallot;
}) {
  const hasFilters = Boolean(query || divisionId);
  const voteSelection = useProjectVoteSelection(ballot);
  return (
    <div className="min-w-0">
      <UiSection aria-label="지난 프로젝트 검색" className="pt-5">
        {hasFilters ? <div className="mb-2 flex justify-end"><Link className="text-xs font-bold text-[var(--primary)]" href={pastHref({ programId })}><UiText>{"조건 초기화"}</UiText></Link></div> : null}
        <ProjectSearchForm view="past" programId={programId} query={query} divisionId={divisionId} />
        {programId && divisions.length ? <UiNav aria-label="지난 프로젝트 분과" className="mt-3 flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{[{ id: "", name: "전체" }, ...divisions, ...(hasUnassigned ? [{ id: "UNASSIGNED", name: "미분과" }] : [])].map((division) => <Link key={division.id || "all"} href={pastHref({ query, programId, divisionId: division.id || undefined })} aria-current={(divisionId ?? "") === division.id ? "page" : undefined} className={`min-h-9 shrink-0 rounded-full border px-3 py-2 text-xs font-semibold ${(divisionId ?? "") === division.id ? "border-[var(--primary)] bg-[var(--primary-subtle)] text-[var(--primary)]" : "border-[var(--line)] bg-white text-[var(--muted)]"}`}><UiText>{division.name}</UiText></Link>)}</UiNav> : null}
      </UiSection>

      <div className="pt-5"><ProjectVoteStatusPanel selection={voteSelection} /></div>

      <section aria-labelledby="past-list-title" className="pt-5">
        <div className="mb-4 flex justify-end">
          <h2 id="past-list-title" className="sr-only"><UiText>{"지난 프로젝트 목록"}</UiText></h2>
          <p className="text-xs font-semibold text-[var(--muted)]"><UiText>{"총"}</UiText>{" "}<strong className="text-[var(--ink)]">{total}</strong><UiText>{"개"}</UiText></p>
        </div>
        {projects.length === 0 ? (
          <EmptyState
            title={hasFilters ? "조건에 맞는 프로젝트가 없습니다" : "아직 지난 프로젝트가 없습니다"}
            description={hasFilters ? "검색어나 프로그램을 변경해 다시 확인하세요." : undefined}
          />
        ) : (
          <>
            <ol className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
              {projects.map((project) => {
                const href = `/topics/archive/${project.id}`;
                const voteCandidate = voteSelection.ballot?.candidates.find(({ id }) => id === project.topicId);

                return (
                  <li key={project.id} className="min-w-0">
                    <article aria-labelledby={`past-project-${project.id}`} className={styles.card}>
                      <ProjectGalleryCover imagePath={project.thumbnailPath} programName={project.programName} title={project.topicTitle} />
                      <div className={styles.body}>
                        <h3 id={`past-project-${project.id}`} className="min-w-0 text-xl font-black leading-7 tracking-[-0.03em]">
                          <Link href={href} className={styles.titleLink}><UiText>{project.topicTitle}</UiText></Link>
                        </h3>
                        <p className="mt-2 text-xs font-semibold text-[var(--primary)]"><UiText>{`${project.programName} · ${project.divisionName ?? "미분과"}`}</UiText></p>
                        {project.advisorEnabled ? <p className="mt-2 truncate text-xs font-semibold text-[var(--muted)]">{project.professorName}</p> : null}
                        <p className="mt-3 line-clamp-2 text-sm leading-6 text-[var(--muted)]"><UiText>{project.topicDescription}</UiText></p>

                        <dl className="mt-5 grid grid-cols-2 gap-3 border-y border-[var(--line)] py-4 text-sm">
                          <div>
                            <dt className="text-[0.7rem] font-semibold text-[var(--muted)]"><UiText>{"프로젝트 팀"}</UiText></dt>
                            <dd className="mt-1 truncate font-bold"><UiText>{project.teamName}</UiText></dd>
                          </div>
                          <div>
                            <dt className="text-[0.7rem] font-semibold text-[var(--muted)]"><UiText>{"참여 · 결과물"}</UiText></dt>
                            <dd className="mt-1 font-bold">{project.memberNames.length}<UiText>{"명 ·"}</UiText>{" "}{project.artifacts.length}<UiText>{"개"}</UiText></dd>
                          </div>
                        </dl>
                        {voteCandidate ? <div className={`mt-5 ${styles.actionLayer}`}><ProjectVoteButton candidate={voteCandidate} selection={voteSelection} /></div> : null}

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
              href={(targetPage) => pastHref({ query, programId, divisionId, page: targetPage })}
            />
          </>
        )}
      </section>
    </div>
  );
}
