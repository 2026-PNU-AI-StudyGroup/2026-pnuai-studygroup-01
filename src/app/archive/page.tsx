import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ListArchivedProjectsService } from "@/modules/team/application/archive-projects";
import { PrismaTeamArchiveRepository } from "@/modules/team/infrastructure/prisma-team-archive-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/shared/ui/app-shell";
import { EmptyState, PageHeader } from "@/shared/ui/page-primitives";
import { firstSearchParam, type SearchParamValue } from "@/shared/ui/search-param";
import { TranslatedText } from "@/shared/ui/translated-text";

const artifactType = { PRESENTATION_VIDEO: "발표 영상", SOURCE_CODE: "소스 코드", POSTER: "포스터", OTHER: "기타" } as const;

function archiveHref({ query, year, category, page }: { query?: string; year?: number; category?: string; page?: number }) {
  const target = new URLSearchParams();
  if (query) target.set("q", query);
  if (year) target.set("year", String(year));
  if (category) target.set("category", category);
  if (page && page > 1) target.set("page", String(page));
  const suffix = target.toString();
  return suffix ? `/archive?${suffix}` : "/archive";
}

export default async function ArchivePage({ searchParams }: {
  searchParams: Promise<{ page?: SearchParamValue; q?: SearchParamValue; year?: SearchParamValue; category?: SearchParamValue }>;
}) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");

  const params = await searchParams;
  const requestedPage = Number(firstSearchParam(params.page) ?? "1");
  const query = firstSearchParam(params.q)?.trim().slice(0, 100) ?? "";
  const category = firstSearchParam(params.category)?.trim().slice(0, 100) ?? "";
  const requestedYear = Number(firstSearchParam(params.year));
  const academicYear = Number.isInteger(requestedYear) && requestedYear >= 2000 && requestedYear <= 9999 ? requestedYear : undefined;
  const archive = await new ListArchivedProjectsService(new PrismaTeamArchiveRepository(prisma)).execute(requestedPage, 20, {
    query,
    academicYear,
    programCategory: category,
  });
  const years = academicYear && !archive.academicYears.includes(academicYear) ? [academicYear, ...archive.academicYears] : archive.academicYears;
  const hasFilters = Boolean(query || academicYear || category);

  return (
    <AppShell role={actor.role} userName="부산대학교" currentPath="/archive">
      <main className="content-shell">
        <div className="lg:grid lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-12">
          <aside aria-label="프로젝트 탐색 메뉴" className="hidden border-r border-[var(--line)] pr-8 lg:block">
            <p className="eyebrow">Project records</p>
            <nav className="mt-5 grid gap-1">
              <Link href="/archive" aria-current="page" className="snap-color flex min-h-11 items-center border-l-2 border-[var(--accent)] pl-4 text-sm font-extrabold text-[var(--accent)]">지난 프로젝트</Link>
              <Link href="/topics" className="button-quiet justify-start px-4 text-sm">주제 탐색</Link>
              <Link href="/dashboard" className="button-quiet justify-start px-4 text-sm">{actor.role === "STUDENT" ? "내 프로젝트" : actor.role === "PROFESSOR" ? "지도 프로젝트" : "전체 프로젝트"}</Link>
            </nav>
            <p className="muted mt-8 border-t border-[var(--line)] pt-6 text-sm leading-6">선배 팀의 주제와 결과물을 다음 프로젝트의 참고 자료로 활용하세요.</p>
          </aside>

          <div className="min-w-0 space-y-10">
            <PageHeader
              eyebrow="Past projects"
              title="종료된 선배 프로젝트"
              description="캡스톤을 중심으로 이전 학년도의 주제와 결과물을 찾아 다음 프로젝트의 출발점으로 참고하세요."
            />

            <section aria-labelledby="archive-filter-title" className="border-b border-[var(--line)] pb-7">
              <div className="mb-4 flex items-baseline justify-between gap-4">
                <h2 id="archive-filter-title" className="text-base font-extrabold">학년도</h2>
                <p className="muted text-sm">검색 결과 {archive.total}개</p>
              </div>
              <nav aria-label="학년도별 프로젝트 필터" className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-3">
                <Link href={archiveHref({ query, category })} aria-current={!academicYear ? "page" : undefined} className={`snap-color inline-flex min-h-11 shrink-0 snap-start items-center rounded-lg border px-4 text-sm font-bold ${!academicYear ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--line)] bg-white hover:border-[var(--accent)] hover:text-[var(--accent)]"}`}>
                  전체 {!academicYear ? <><span aria-hidden="true" className="ml-2">✓</span><span className="sr-only">선택됨</span></> : null}
                </Link>
                {years.map((year) => {
                  const selected = academicYear === year;
                  return <Link key={year} href={archiveHref({ query, year, category })} aria-current={selected ? "page" : undefined} className={`snap-color inline-flex min-h-11 shrink-0 snap-start items-center rounded-lg border px-4 text-sm font-bold ${selected ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--line)] bg-white hover:border-[var(--accent)] hover:text-[var(--accent)]"}`}>
                    {year} {selected ? <><span aria-hidden="true" className="ml-2">✓</span><span className="sr-only">선택됨</span></> : null}
                  </Link>;
                })}
              </nav>

              <form action="/archive" className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_auto_auto] md:items-end">
                {academicYear ? <input type="hidden" name="year" value={academicYear} /> : null}
                <label className="grid gap-2 text-sm font-semibold">프로젝트 검색<input className="field" type="search" name="q" defaultValue={query} maxLength={100} placeholder="주제, 팀, 교수, 기술, 결과물" /></label>
                <label className="grid gap-2 text-sm font-semibold">프로그램 분류<select className="field" name="category" defaultValue={category}><option value="">전체 분류</option>{archive.programCategories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                <button className="button-primary" type="submit">검색</button>
                {hasFilters ? <Link className="button-quiet" href="/archive">초기화</Link> : null}
              </form>
            </section>

            <section aria-labelledby="archive-list-title">
              <div className="mb-4 flex items-end justify-between gap-4">
                <h2 id="archive-list-title" className="text-2xl font-extrabold tracking-[-0.035em]">프로젝트 목록</h2>
                <p className="muted text-sm">{archive.page} / {archive.totalPages} 페이지</p>
              </div>

              {archive.projects.length === 0 ? (
                <EmptyState title={hasFilters ? "조건에 맞는 프로젝트가 없습니다" : "아직 종료된 프로젝트가 없습니다"} description={hasFilters ? "검색어, 학년도 또는 프로그램 분류를 바꿔 다시 찾아보세요." : "최종 보고서 승인 후 팀이 종료되면 선배 프로젝트와 결과물이 이곳에 쌓입니다."} action={hasFilters ? <Link className="button-secondary" href="/archive">전체 프로젝트 보기</Link> : undefined} />
              ) : (
                <>
                  <div aria-hidden="true" className="hidden border-y border-[var(--line)] py-3 text-xs font-extrabold text-[var(--muted)] lg:grid lg:grid-cols-[5rem_minmax(16rem,1.5fr)_minmax(10rem,.8fr)_minmax(8rem,.6fr)_7rem] lg:gap-5">
                    <span>연도</span><span>프로젝트</span><span>팀 · 지도교수</span><span>프로그램</span><span>결과물</span>
                  </div>
                  <ol className="divide-y divide-[var(--line)] border-b border-[var(--line)]">
                    {archive.projects.map((project) => {
                      const skills = [...new Set([...project.requiredSkills, ...project.preferredSkills])];
                      return (
                        <li key={project.id} className="py-7">
                          <article aria-labelledby={`archive-project-${project.id}`} className="grid grid-cols-[4.75rem_minmax(0,1fr)] gap-x-4 gap-y-4 lg:grid-cols-[5rem_minmax(16rem,1.5fr)_minmax(10rem,.8fr)_minmax(8rem,.6fr)_7rem] lg:gap-x-5">
                            <div>
                              <p className="inline-flex min-h-11 min-w-16 items-center justify-center rounded-lg border border-[var(--accent)] text-lg font-black text-[var(--accent)] lg:min-h-0 lg:min-w-0 lg:justify-start lg:border-0 lg:text-base lg:text-[var(--ink)]">{project.academicYear}</p>
                              <p className="muted mt-1 text-xs">{project.term === "FIRST" ? "1학기" : "2학기"}</p>
                            </div>
                            <div>
                              <p className="text-xs font-extrabold text-[var(--accent)] lg:hidden">{project.programName}</p>
                              <h3 id={`archive-project-${project.id}`} className="mt-1 font-extrabold leading-6 tracking-[-0.02em] lg:mt-0">{project.topicTitle}</h3>
                              <ul aria-label="프로젝트 기술" className="mt-2 flex flex-wrap gap-x-2 gap-y-1">{skills.map((skill) => <li key={skill} className="muted text-xs font-semibold">#{skill}</li>)}</ul>
                            </div>
                            <div className="col-start-2 text-sm lg:col-auto"><p className="font-semibold">{project.teamName}</p><p className="muted mt-1">{project.professorName} 교수</p></div>
                            <div className="col-start-2 text-sm lg:col-auto"><p className="font-semibold">{project.programName}</p><p className="muted mt-1 text-xs">{project.programCategory}</p></div>
                            <div className="col-start-2 text-sm lg:col-auto"><p className="font-extrabold">{project.artifacts.length}개</p><p className="muted mt-1 text-xs">공개 결과물</p></div>
                            <details className="group col-span-2 border-t border-[var(--line)] pt-3 lg:col-span-5">
                              <summary className="snap-color flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-sm font-extrabold text-[var(--accent)]">설명과 결과물 보기<span aria-hidden="true" className="group-open:rotate-180">↓</span></summary>
                              <div className="grid gap-6 pb-2 pt-3 lg:grid-cols-[minmax(0,1fr)_16rem]">
                                <div><TranslatedText text={project.topicDescription} className="muted whitespace-pre-wrap leading-7" /><p className="muted mt-4 text-sm">참여 {project.memberNames.join(", ")}</p></div>
                                <div><p className="text-sm font-extrabold">공개 결과물</p>{project.artifacts.length ? <ul className="mt-2 grid gap-1">{project.artifacts.map((artifact) => <li key={artifact.id}>{artifact.fileId ? <a className="button-quiet min-h-11 w-full justify-start px-0 text-left text-[var(--accent)]" href={`/api/files/${artifact.fileId}`}>{artifactType[artifact.type]} · {artifact.fileName ?? artifact.title}</a> : artifact.externalUrl ? <a className="button-quiet min-h-11 w-full justify-start px-0 text-left text-[var(--accent)]" href={artifact.externalUrl} target="_blank" rel="noreferrer">{artifactType[artifact.type]} · {artifact.title}<span className="sr-only"> 새 창</span></a> : <span className="muted flex min-h-11 items-center text-sm">{artifactType[artifact.type]} · {artifact.title}</span>}</li>)}</ul> : <p className="muted mt-2 text-sm">공개된 결과물이 없습니다.</p>}</div>
                              </div>
                            </details>
                          </article>
                        </li>
                      );
                    })}
                  </ol>

                  <nav aria-label="아카이브 페이지" className="mt-6 flex items-center justify-between gap-4"><span className="muted text-sm">총 {archive.total}개</span><div className="flex gap-2">{archive.page > 1 ? <Link className="button-quiet" href={archiveHref({ query, year: academicYear, category, page: archive.page - 1 })}>이전</Link> : null}{archive.page < archive.totalPages ? <Link className="button-quiet" href={archiveHref({ query, year: academicYear, category, page: archive.page + 1 })}>다음</Link> : null}</div></nav>
                </>
              )}
            </section>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
