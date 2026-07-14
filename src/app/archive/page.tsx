import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ListArchivedProjectsService } from "@/modules/team/application/archive-projects";
import { PrismaTeamArchiveRepository } from "@/modules/team/infrastructure/prisma-team-archive-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/shared/ui/app-shell";
import { EmptyState, PageHeader, StatusBadge } from "@/shared/ui/page-primitives";
import { TranslatedText } from "@/shared/ui/translated-text";

const artifactType = { PRESENTATION_VIDEO: "발표 영상", SOURCE_CODE: "소스 코드", POSTER: "포스터", OTHER: "기타" } as const;

export default async function ArchivePage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  const requestedPage = Number((await searchParams).page ?? "1");
  const archive = await new ListArchivedProjectsService(
    new PrismaTeamArchiveRepository(prisma),
  ).execute(requestedPage, 20);
  const projects = archive.projects;
  return (
    <AppShell role={actor.role} userName="부산대학교" currentPath="/archive">
      <main className="content-shell space-y-10">
        <PageHeader eyebrow="Archive" title="졸업과제 아카이브" description="승인과 종료가 완료된 선배 프로젝트의 주제와 결과물을 살펴보세요." />
        {projects.length === 0 ? <EmptyState title="아직 종료된 프로젝트가 없습니다" description="최종 보고서 승인 후 팀이 종료되면 이곳에 프로젝트가 보관됩니다." /> : <><ol className="divide-y divide-[var(--line)] border-y border-[var(--line)]">{projects.map((project) => <li key={project.id} className="py-8"><div className="flex flex-wrap items-center gap-3"><StatusBadge tone="neutral">{project.academicYear} · {project.term === "FIRST" ? "1학기" : "2학기"}</StatusBadge><span className="muted text-sm">{project.teamName}</span></div><h2 className="mt-4 text-xl font-bold">{project.topicTitle}</h2><TranslatedText text={project.topicDescription} className="muted mt-3 leading-7" /><p className="muted mt-4 text-sm">지도교수 {project.professorName} · {project.memberNames.join(", ")}</p>{project.artifacts.length ? <ul className="mt-5 flex flex-wrap gap-3">{project.artifacts.map((artifact) => <li key={artifact.id}>{artifact.fileId ? <a className="button-quiet" href={`/api/files/${artifact.fileId}`}>{artifactType[artifact.type]} · {artifact.fileName ?? artifact.title}</a> : <a className="button-quiet" href={artifact.externalUrl} target="_blank" rel="noreferrer">{artifactType[artifact.type]} · {artifact.title}</a>}</li>)}</ul> : <p className="muted mt-5 text-sm">공개된 결과물이 없습니다.</p>}</li>)}</ol><nav aria-label="아카이브 페이지" className="flex items-center justify-between"><span className="muted text-sm">{archive.page} / {archive.totalPages} 페이지 · 총 {archive.total}개</span><div className="flex gap-2">{archive.page > 1 ? <Link className="button-quiet" href={`/archive?page=${archive.page - 1}`}>이전</Link> : null}{archive.page < archive.totalPages ? <Link className="button-quiet" href={`/archive?page=${archive.page + 1}`}>다음</Link> : null}</div></nav></>}
      </main>
    </AppShell>
  );
}
