import Link from "next/link";

import { ProgramFilterCards } from "@/app/topics/_components/program-filter-cards";
import type { ArchivedProgramOption, ArchivedProject } from "@/modules/team/application/archive-projects";
import { EmptyState } from "@/shared/ui/page-primitives";

function pastHref({ query, programId, page }: { query?: string; programId?: string; page?: number }) {
  const target = new URLSearchParams({ view: "past" });
  if (query) target.set("q", query);
  if (programId) target.set("programId", programId);
  if (page && page > 1) target.set("page", String(page));
  return `/topics?${target.toString()}`;
}

export function PastProjectsView({ projects, total, page, totalPages, programs, query, programId }: {
  projects: ArchivedProject[];
  total: number;
  page: number;
  totalPages: number;
  programs: ArchivedProgramOption[];
  query: string;
  programId?: string;
}) {
  const hasFilters = Boolean(query || programId);
  return <div className="space-y-7">
    <ProgramFilterCards
      allHref={pastHref({ query })}
      selectedId={programId}
      options={programs.map((program) => ({ ...program, href: pastHref({ query, programId: program.id }) }))}
    />
    <section aria-labelledby="past-filter-title" className="grid gap-5 rounded-[var(--radius-panel)] bg-[var(--surface-subtle)] p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(30rem,.82fr)] lg:items-end">
      <div><h2 id="past-filter-title" className="text-xs font-extrabold text-[var(--muted)]">지난 프로젝트</h2><p className="mt-2 text-lg font-extrabold">검색 결과 {total}개</p></div>
      <form action="/topics" className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
        <input type="hidden" name="view" value="past" />{programId ? <input type="hidden" name="programId" value={programId} /> : null}
        <label className="grid gap-2 text-xs font-extrabold text-[var(--muted)]">프로젝트 검색<input className="field" type="search" name="q" defaultValue={query} maxLength={100} placeholder="주제, 팀, 교수, 기술, 결과물" /></label>
        <button className="button-primary min-w-12 gap-2 sm:px-4" type="submit"><svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-[1.8]"><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/></svg><span>검색</span></button>
        {hasFilters ? <Link className="button-quiet" href="/topics?view=past">초기화</Link> : null}
      </form>
    </section>

    <section aria-labelledby="past-list-title">
      <div className="mb-4 flex items-end justify-between gap-4"><h2 id="past-list-title" className="text-2xl font-extrabold tracking-[-0.035em]">프로젝트 목록</h2><p className="muted text-sm">{page} / {totalPages} 페이지</p></div>
      {projects.length === 0 ? <EmptyState title={hasFilters ? "조건에 맞는 프로젝트가 없습니다" : "아직 지난 프로젝트가 없습니다"} description={hasFilters ? "검색어, 학년도 또는 프로그램 분류를 바꿔 다시 찾아보세요." : "완료된 프로젝트와 결과물이 차곡차곡 쌓일 예정입니다."} action={hasFilters ? <Link className="button-secondary" href="/topics?view=past">전체 프로젝트 보기</Link> : undefined} /> : <>
        <div aria-hidden="true" className="hidden border-y border-[var(--line)] py-3 text-xs font-extrabold text-[var(--muted)] lg:grid lg:grid-cols-[5rem_minmax(16rem,1.5fr)_minmax(10rem,.8fr)_minmax(8rem,.6fr)_7rem] lg:gap-5"><span>연도</span><span>프로젝트</span><span>팀 · 지도교수</span><span>프로그램</span><span>결과물</span></div>
        <ol className="divide-y divide-[var(--line)] border-b border-[var(--line)]">{projects.map((project) => {
          const skills = [...new Set([...project.requiredSkills, ...project.preferredSkills])];
          return <li key={project.id} className="py-7"><article aria-labelledby={`past-project-${project.id}`} className="grid grid-cols-[4.75rem_minmax(0,1fr)] gap-x-4 gap-y-4 lg:grid-cols-[5rem_minmax(16rem,1.5fr)_minmax(10rem,.8fr)_minmax(8rem,.6fr)_7rem] lg:gap-x-5">
            <div><p className="inline-flex min-h-11 min-w-16 items-center justify-center rounded-lg border border-[var(--line)] text-lg font-black text-[var(--ink)] lg:min-h-0 lg:min-w-0 lg:justify-start lg:border-0 lg:text-base">{project.academicYear}</p></div>
            <div><p className="muted text-xs font-extrabold lg:hidden">{project.programName}</p><h3 id={`past-project-${project.id}`} className="mt-1 font-extrabold leading-6 tracking-[-0.02em] lg:mt-0">{project.topicTitle}</h3><ul aria-label="프로젝트 기술" className="mt-2 flex flex-wrap gap-x-2 gap-y-1">{skills.map((skill) => <li key={skill} className="muted text-xs font-semibold">#{skill}</li>)}</ul></div>
            <div className="col-start-2 text-sm lg:col-auto"><p className="font-semibold">{project.teamName}</p><p className="muted mt-1">{project.professorName} 교수</p></div>
            <div className="col-start-2 text-sm lg:col-auto"><p className="font-semibold">{project.programName}</p><p className="muted mt-1 text-xs">{project.programCategory}</p></div>
            <div className="col-start-2 text-sm lg:col-auto"><p className="font-extrabold">{project.artifacts.length}개</p><p className="muted mt-1 text-xs">공개 결과물</p></div>
            <Link href={`/topics/archive/${project.id}`} className="button-quiet col-span-2 justify-self-start px-0 text-[var(--primary)] lg:col-span-5">프로젝트 상세 보기 <span aria-hidden="true" className="project-row-arrow ml-2">→</span></Link>
          </article></li>;
        })}</ol>
        <nav aria-label="지난 프로젝트 페이지" className="mt-6 flex items-center justify-between gap-4"><span className="muted text-sm">총 {total}개</span><div className="flex gap-2">{page > 1 ? <Link className="button-quiet" href={pastHref({ query, programId, page: page - 1 })}>이전</Link> : null}{page < totalPages ? <Link className="button-quiet" href={pastHref({ query, programId, page: page + 1 })}>다음</Link> : null}</div></nav>
      </>}
    </section>
  </div>;
}
