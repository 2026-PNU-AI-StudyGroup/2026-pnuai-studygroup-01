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

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: SearchParamValue; q?: SearchParamValue; year?: SearchParamValue }>;
}) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const params = await searchParams;
  const requestedPage = Number(firstSearchParam(params.page) ?? "1");
  const query = firstSearchParam(params.q)?.trim() ?? "";
  const year = firstSearchParam(params.year) ?? "";
  const academicYear = Number(year);
  const archive = await new ListArchivedProjectsService(
    new PrismaTeamArchiveRepository(prisma),
  ).execute(requestedPage, 20, {
    query,
    academicYear,
  });
  const projects = archive.projects;
  const hasFilters = Boolean(query || year);
  const pageHref = (page: number) => {
    const target = new URLSearchParams();
    target.set("page", String(page));
    if (query) target.set("q", query);
    if (year) target.set("year", year);
    return `/archive?${target.toString()}`;
  };

  return (
    <AppShell role={actor.role} userName="부산대학교" currentPath="/archive">
      <main className="content-shell space-y-10">
        <PageHeader eyebrow="Project archive" title="프로젝트 아카이브" description="종료된 학과 프로젝트의 주제, 참여자와 공개 결과물을 연도별로 확인하세요." />
        <form action="/archive" className="grid gap-4 border-y border-[var(--line)] py-5 md:grid-cols-[minmax(0,1fr)_12rem_auto_auto] md:items-end">
          <label className="grid gap-2 text-sm font-semibold">
            프로젝트 검색
            <input className="field" name="q" defaultValue={query} maxLength={100} placeholder="주제, 팀, 교수, 기술, 결과물" />
          </label>
          <label className="grid gap-2 text-sm font-semibold">
            수행 연도
            <input className="field" name="year" type="number" min="2000" max="9999" defaultValue={year} placeholder="2026" />
          </label>
          <button className="button-primary" type="submit">조회</button>
          {hasFilters ? <Link className="button-quiet" href="/archive">초기화</Link> : null}
        </form>
        {projects.length === 0 ? (
          <EmptyState
            title={hasFilters ? "조건에 맞는 프로젝트가 없습니다" : "아직 종료된 프로젝트가 없습니다"}
            description={hasFilters ? "검색어나 수행 연도를 바꿔 다시 조회하세요." : "최종 보고서 승인 후 팀이 종료되면 이곳에 프로젝트가 보관됩니다."}
          />
        ) : (
          <>
            <ol className="border-b border-[var(--line)]">
              {projects.map((project) => (
                <li key={project.id} className="border-t border-[var(--line)] py-9">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs font-bold text-[var(--accent)]">{project.academicYear} · {project.term === "FIRST" ? "1학기" : "2학기"}</span>
                    <span className="muted text-sm">{project.teamName}</span>
                  </div>
                  <h2 className="mt-4 text-2xl font-extrabold tracking-[-0.035em]">{project.topicTitle}</h2>
                  <TranslatedText text={project.topicDescription} className="muted mt-3 max-w-3xl leading-7" />
                  <p className="muted mt-4 text-sm">지도교수 {project.professorName} · {project.memberNames.join(", ")}</p>
                  {project.artifacts.length ? (
                    <ul className="mt-5 flex flex-wrap gap-3">
                      {project.artifacts.map((artifact) => (
                        <li key={artifact.id}>
                          {artifact.fileId ? <a className="button-quiet" href={`/api/files/${artifact.fileId}`}>{artifactType[artifact.type]} · {artifact.fileName ?? artifact.title}</a> : <a className="button-quiet" href={artifact.externalUrl} target="_blank" rel="noreferrer">{artifactType[artifact.type]} · {artifact.title}</a>}
                        </li>
                      ))}
                    </ul>
                  ) : <p className="muted mt-5 text-sm">공개된 결과물이 없습니다.</p>}
                </li>
              ))}
            </ol>
            <nav aria-label="아카이브 페이지" className="flex items-center justify-between">
              <span className="muted text-sm">{archive.page} / {archive.totalPages} 페이지 · 총 {archive.total}개</span>
              <div className="flex gap-2">
                {archive.page > 1 ? <Link className="button-quiet" href={pageHref(archive.page - 1)}>이전</Link> : null}
                {archive.page < archive.totalPages ? <Link className="button-quiet" href={pageHref(archive.page + 1)}>다음</Link> : null}
              </div>
            </nav>
          </>
        )}
      </main>
    </AppShell>
  );
}
