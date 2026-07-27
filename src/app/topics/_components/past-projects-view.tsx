import Link from "next/link";
import { UiSection, UiUl } from "@/modules/translation/ui/localized-elements";
import { UiText } from "@/modules/translation/ui/i18n-provider";

import { ProjectGalleryCover } from "@/app/topics/_components/project-gallery-cover";
import { ProjectPagination } from "@/app/topics/_components/project-pagination";
import { ProjectSearchForm } from "@/app/topics/_components/project-search-form";
import styles from "@/app/topics/_components/project-gallery.module.css";
import type { ArchivedProject } from "@/modules/team/application/archive-projects";
import { EmptyState } from "@/shared/ui/page-primitives";

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

export function PastProjectsView({ projects, total, page, totalPages, query, programId }: {
  projects: ArchivedProject[];
  total: number;
  page: number;
  totalPages: number;
  query: string;
  programId?: string;
}) {
  const hasFilters = Boolean(query || programId);
  return (
    <div className="min-w-0">
      <UiSection aria-label="지난 프로젝트 검색" className="pt-5">
        {hasFilters ? <div className="mb-2 flex justify-end"><Link className="text-xs font-black text-[var(--primary)]" href="/topics?view=past"><UiText>{"조건 초기화"}</UiText></Link></div> : null}
        <ProjectSearchForm view="past" programId={programId} query={query} />
      </UiSection>

      <section aria-labelledby="past-list-title" className="pt-5">
        <div className="mb-4 flex justify-end">
          <h2 id="past-list-title" className="sr-only"><UiText>{"지난 프로젝트 목록"}</UiText></h2>
          <p className="text-xs font-bold text-[var(--muted)]"><UiText>{"총"}</UiText>{" "}<strong className="text-[var(--ink)]">{total}</strong><UiText>{"개"}</UiText></p>
        </div>
        {projects.length === 0 ? (
          <EmptyState
            title={hasFilters ? "조건에 맞는 프로젝트가 없습니다" : "아직 지난 프로젝트가 없습니다"}
            description={hasFilters ? "검색어나 프로그램을 바꿔 다시 찾아보세요." : "완료된 프로젝트와 결과물이 이곳에 쌓입니다."}
            action={hasFilters ? <Link className="button-secondary" href="/topics?view=past"><UiText>{"전체 프로젝트 보기"}</UiText></Link> : undefined}
          />
        ) : (
          <>
            <ol className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
              {projects.map((project) => {
                const href = `/topics/archive/${project.id}`;
                const skills = [...new Set([...project.requiredSkills, ...project.preferredSkills])];
                const visibleSkills = skills.slice(0, 2);
                const remainingSkillCount = Math.max(0, skills.length - visibleSkills.length);

                return (
                  <li key={project.id} className="min-w-0">
                    <article aria-labelledby={`past-project-${project.id}`} className={styles.card}>
                      <ProjectGalleryCover
                        id={project.id}
                        href={href}
                        label={`${project.programCategory} · ${project.programName}`}
                        title={project.topicTitle}
                        professorName={project.professorName}
                        authorSuffix={project.advisorRole}
                        imagePath={project.thumbnailPath}
                      />
                      <div className={styles.body}>
                        <h3 id={`past-project-${project.id}`} className="min-w-0 text-xl font-black leading-7 tracking-[-0.03em]">
                          <Link href={href} className={styles.titleLink}><UiText>{project.topicTitle}</UiText></Link>
                        </h3>

                        <dl className="mt-5 grid grid-cols-2 gap-3 border-y border-[var(--line)] py-4 text-sm">
                          <div>
                            <dt className="text-[0.7rem] font-bold text-[var(--muted)]"><UiText>{"프로젝트 팀"}</UiText></dt>
                            <dd className="mt-1 truncate font-black"><UiText>{project.teamName}</UiText></dd>
                          </div>
                          <div>
                            <dt className="text-[0.7rem] font-bold text-[var(--muted)]"><UiText>{"참여 · 결과물"}</UiText></dt>
                            <dd className="mt-1 font-black">{project.memberNames.length}<UiText>{"명 ·"}</UiText>{" "}{project.artifacts.length}<UiText>{"개"}</UiText></dd>
                          </div>
                        </dl>

                        <div className="mt-4 flex items-end justify-between gap-4">
                          <UiUl aria-label="프로젝트 기술" className="flex min-w-0 flex-wrap items-center gap-1.5">
                            {visibleSkills.map((skill) => (
                              <li key={skill} className="max-w-[8rem] truncate rounded-md bg-[var(--surface-subtle)] px-2 py-1 text-xs font-bold text-[var(--muted)]"><UiText>{skill}</UiText></li>
                            ))}
                            {remainingSkillCount ? <li className="text-xs font-bold text-[var(--muted)]"><UiText>{"외"}</UiText>{" "}{remainingSkillCount}</li> : null}
                          </UiUl>
                          <span className="shrink-0 text-xs font-black text-[var(--muted)]">{project.academicYear}</span>
                        </div>
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
