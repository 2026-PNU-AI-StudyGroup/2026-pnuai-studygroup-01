import Link from "next/link";

import { ProgramFilterCards } from "@/app/topics/_components/program-filter-cards";
import { ProjectGalleryCover } from "@/app/topics/_components/project-gallery-cover";
import styles from "@/app/topics/_components/project-gallery.module.css";
import type { ArchivedProgramOption, ArchivedProject } from "@/modules/team/application/archive-projects";
import { EmptyState, StatusBadge } from "@/shared/ui/page-primitives";

export function pastHref({ query, category, programId, page }: {
  query?: string;
  category?: string;
  programId?: string;
  page?: number;
}) {
  const target = new URLSearchParams({ view: "past" });
  if (query) target.set("q", query);
  if (category) target.set("category", category);
  if (programId) target.set("programId", programId);
  if (page && page > 1) target.set("page", String(page));
  return `/topics?${target.toString()}`;
}

export function PastProjectsView({ projects, total, page, totalPages, programCategories, programs, query, category = "", programId }: {
  projects: ArchivedProject[];
  total: number;
  page: number;
  totalPages: number;
  programCategories: string[];
  programs: ArchivedProgramOption[];
  query: string;
  category?: string;
  programId?: string;
}) {
  const hasFilters = Boolean(query || category || programId);
  const allProgramsHref = pastHref({ query, category });

  return (
    <div className="min-w-0 space-y-8 lg:space-y-10">
      <section aria-labelledby="past-filter-title" className="border-b border-[var(--line)] pb-5">
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 id="past-filter-title" className="text-lg font-black tracking-[-0.025em]">지난 프로젝트 찾기</h2>
          {hasFilters ? <Link className="text-sm font-black text-[var(--primary)]" href="/topics?view=past">조건 초기화</Link> : null}
        </div>
        <form action="/topics" className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center" role="search">
          <input type="hidden" name="view" value="past" />
          {category ? <input type="hidden" name="category" value={category} /> : null}
          {programId ? <input type="hidden" name="programId" value={programId} /> : null}
          <label className="relative block">
            <span className="sr-only">지난 프로젝트 검색</span>
            <svg aria-hidden="true" viewBox="0 0 24 24" className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 fill-none stroke-[var(--muted)] stroke-[1.8]">
              <circle cx="11" cy="11" r="7" />
              <path d="m16.5 16.5 4 4" />
            </svg>
            <input className="field min-h-13 w-full bg-white pl-12 text-[0.95rem]" type="search" name="q" defaultValue={query} maxLength={100} placeholder="주제, 팀, 교수, 기술로 검색" />
          </label>
          <button className="button-primary min-h-13 px-5" type="submit">검색</button>
        </form>
        {programCategories.length ? (
          <nav aria-label="프로그램 분류" className="mt-4 flex gap-5 overflow-x-auto text-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Link href={pastHref({ query, programId })} aria-current={!category ? "page" : undefined} className={`shrink-0 border-b-2 py-2 font-bold ${!category ? "border-[var(--primary)] text-[var(--ink)]" : "border-transparent text-[var(--muted)]"}`}>전체 분류</Link>
            {programCategories.map((item) => (
              <Link key={item} href={pastHref({ query, category: item })} aria-current={category === item ? "page" : undefined} className={`shrink-0 border-b-2 py-2 font-bold ${category === item ? "border-[var(--primary)] text-[var(--ink)]" : "border-transparent text-[var(--muted)]"}`}>{item}</Link>
            ))}
          </nav>
        ) : null}
      </section>

      <ProgramFilterCards
        allHref={allProgramsHref}
        selectedId={programId}
        options={programs.map((program) => ({
          ...program,
          href: pastHref({ query, category, programId: program.id }),
        }))}
      />

      <section aria-labelledby="past-list-title">
        <div className="mb-5 flex items-end justify-between gap-4">
          <h2 id="past-list-title" className="text-[clamp(1.65rem,3vw,2.2rem)] font-black tracking-[-0.045em]">완료된 프로젝트</h2>
          <p className="text-sm font-bold text-[var(--muted)]">{total}개</p>
        </div>
        {projects.length === 0 ? (
          <EmptyState
            title={hasFilters ? "조건에 맞는 프로젝트가 없습니다" : "아직 지난 프로젝트가 없습니다"}
            description={hasFilters ? "검색어나 프로그램을 바꿔 다시 찾아보세요." : "완료된 프로젝트와 결과물이 이곳에 쌓입니다."}
            action={hasFilters ? <Link className="button-secondary" href="/topics?view=past">전체 프로젝트 보기</Link> : undefined}
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
                      />
                      <div className={styles.body}>
                        <div className="flex items-start justify-between gap-3">
                          <h3 id={`past-project-${project.id}`} className="min-w-0 text-xl font-black leading-7 tracking-[-0.03em]">
                            <Link href={href} className={styles.titleLink}>{project.topicTitle}</Link>
                          </h3>
                          <StatusBadge tone="neutral">완료</StatusBadge>
                        </div>

                        <dl className="mt-5 grid grid-cols-2 gap-3 border-y border-[var(--line)] py-4 text-sm">
                          <div>
                            <dt className="text-[0.7rem] font-bold text-[var(--muted)]">프로젝트 팀</dt>
                            <dd className="mt-1 truncate font-black">{project.teamName}</dd>
                          </div>
                          <div>
                            <dt className="text-[0.7rem] font-bold text-[var(--muted)]">참여 · 결과물</dt>
                            <dd className="mt-1 font-black">{project.memberNames.length}명 · {project.artifacts.length}개</dd>
                          </div>
                        </dl>

                        <div className="mt-4 flex items-end justify-between gap-4">
                          <ul aria-label="프로젝트 기술" className="flex min-w-0 flex-wrap items-center gap-1.5">
                            {visibleSkills.map((skill) => (
                              <li key={skill} className="max-w-[8rem] truncate rounded-md bg-[var(--surface-subtle)] px-2 py-1 text-xs font-bold text-[var(--muted)]">{skill}</li>
                            ))}
                            {remainingSkillCount ? <li className="text-xs font-bold text-[var(--muted)]">외 {remainingSkillCount}</li> : null}
                          </ul>
                          <span className="shrink-0 text-xs font-black text-[var(--muted)]">{project.academicYear}</span>
                        </div>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ol>
            {totalPages > 1 ? (
              <nav aria-label="지난 프로젝트 페이지" className="mt-7 flex items-center justify-between gap-4">
                <span className="text-sm font-semibold text-[var(--muted)]">{page} / {totalPages} 페이지</span>
                <div className="flex gap-2">
                  {page > 1 ? <Link className="button-quiet" href={pastHref({ query, category, programId, page: page - 1 })}>이전</Link> : null}
                  {page < totalPages ? <Link className="button-quiet" href={pastHref({ query, category, programId, page: page + 1 })}>다음</Link> : null}
                </div>
              </nav>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
