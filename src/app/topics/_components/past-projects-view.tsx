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
  return <div className="grid items-start gap-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-7">
    <aside className="lg:sticky lg:top-24"><ProgramFilterCards
      allHref={pastHref({ query })}
      selectedId={programId}
      options={programs.map((program) => ({ ...program, href: pastHref({ query, programId: program.id }) }))}
    /></aside>
    <div className="min-w-0 space-y-7">
    <section aria-labelledby="past-filter-title" className="rounded-2xl border border-[var(--line)] bg-white p-4 shadow-[0_10px_30px_rgb(23_32_51_/_0.045)] sm:p-5">
      <div className="flex flex-col gap-4 border-b border-[var(--line)] pb-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 id="past-filter-title" className="text-xs font-extrabold text-[var(--muted)]">지난 프로젝트</h2><p className="mt-1 text-lg font-black">검색 결과 {total}개</p></div>{hasFilters ? <Link className="button-quiet self-start sm:self-auto" href="/topics?view=past">조건 초기화</Link> : null}</div>
      <form action="/topics" className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <input type="hidden" name="view" value="past" />{programId ? <input type="hidden" name="programId" value={programId} /> : null}
        <label className="grid gap-2 text-xs font-extrabold text-[var(--muted)]">프로젝트 검색<input className="field" type="search" name="q" defaultValue={query} maxLength={100} placeholder="주제, 팀, 교수, 기술, 결과물" /></label>
        <button className="button-primary min-w-12 gap-2 sm:px-4" type="submit"><svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-[1.8]"><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/></svg><span>검색</span></button>
      </form>
    </section>

    <section aria-labelledby="past-list-title">
      <div className="mb-4 flex items-end justify-between gap-4"><h2 id="past-list-title" className="text-2xl font-extrabold tracking-[-0.035em]">프로젝트 목록</h2><p className="muted text-sm">{page} / {totalPages} 페이지</p></div>
      {projects.length === 0 ? <EmptyState title={hasFilters ? "조건에 맞는 프로젝트가 없습니다" : "아직 지난 프로젝트가 없습니다"} description={hasFilters ? "검색어, 학년도 또는 프로그램 분류를 바꿔 다시 찾아보세요." : "완료된 프로젝트와 결과물이 차곡차곡 쌓일 예정입니다."} action={hasFilters ? <Link className="button-secondary" href="/topics?view=past">전체 프로젝트 보기</Link> : undefined} /> : <>
        <ol className="grid gap-4 xl:grid-cols-2">{projects.map((project) => {
          const skills = [...new Set([...project.requiredSkills, ...project.preferredSkills])];
          return <li key={project.id} className="min-w-0"><article aria-labelledby={`past-project-${project.id}`} className="flex h-full min-h-72 flex-col rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[0_10px_30px_rgb(23_32_51_/_0.045)] transition-colors hover:border-[var(--primary)] sm:p-6">
            <div className="flex items-start justify-between gap-3"><span className="rounded-lg bg-[var(--primary-subtle)] px-2.5 py-1 text-xs font-black text-[var(--primary-hover)]">{project.academicYear}</span><span className="text-xs font-bold text-[var(--muted)]">{project.artifacts.length}개 결과물</span></div>
            <p className="mt-5 text-xs font-bold text-[var(--muted)]">{project.programCategory} · {project.programName}</p>
            <h3 id={`past-project-${project.id}`} className="mt-2 text-xl font-black leading-7 tracking-[-0.025em]">{project.topicTitle}</h3>
            <ul aria-label="프로젝트 기술" className="mt-3 flex flex-wrap gap-1.5">{skills.map((skill) => <li key={skill} className="rounded-lg bg-[var(--surface-subtle)] px-2 py-1 text-xs font-semibold text-[var(--muted)]">{skill}</li>)}</ul>
            <div className="mt-auto flex items-end justify-between gap-4 border-t border-[var(--line)] pt-5 text-sm"><div><p className="font-bold">{project.teamName}</p><p className="muted mt-1">{project.professorName} 교수</p></div><Link href={`/topics/archive/${project.id}`} className="button-quiet shrink-0 px-0 text-[var(--primary)]">상세 보기 <span aria-hidden="true" className="project-row-arrow ml-1">→</span></Link></div>
          </article></li>;
        })}</ol>
        <nav aria-label="지난 프로젝트 페이지" className="mt-6 flex items-center justify-between gap-4"><span className="muted text-sm">총 {total}개</span><div className="flex gap-2">{page > 1 ? <Link className="button-quiet" href={pastHref({ query, programId, page: page - 1 })}>이전</Link> : null}{page < totalPages ? <Link className="button-quiet" href={pastHref({ query, programId, page: page + 1 })}>다음</Link> : null}</div></nav>
      </>}
    </section>
    </div>
  </div>;
}
