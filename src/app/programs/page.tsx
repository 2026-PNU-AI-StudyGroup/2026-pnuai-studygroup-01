import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ProjectProgramService } from "@/modules/project-program/application/manage-project-programs";
import { PrismaProjectProgramRepository } from "@/modules/project-program/infrastructure/prisma-project-program-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/shared/ui/app-shell";
import { EmptyState, PageHeader } from "@/shared/ui/page-primitives";
import { TranslatedText } from "@/shared/ui/translated-text";
const date = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeZone: "Asia/Seoul" });

export default async function ProgramsPage() {
  const actor = await getCurrentActor(); if (!actor) redirect("/sign-in");
  const programs = await new ProjectProgramService(new PrismaProjectProgramRepository(prisma)).listOpen();
  return <AppShell role={actor.role} userName="부산대학교" currentPath="/programs"><main className="content-shell space-y-10">
    <PageHeader eyebrow="Academic programs" title="학과 프로젝트 프로그램" description="캡스톤 디자인부터 해커톤, 대회, 교육 프로그램까지 현재 운영 중인 학과 프로젝트를 확인하세요." />
    {programs.length === 0 ? <EmptyState title="공개된 프로그램이 없습니다" description="관리자가 새 프로젝트 프로그램을 공개하면 이곳에 표시됩니다." /> : <ol className="border-b border-[var(--line)]">{programs.map((program) => <li key={program.id} className="grid gap-6 border-t border-[var(--line)] py-9 md:grid-cols-[minmax(0,1fr)_13rem] md:items-start"><div><div className="flex flex-wrap gap-3"><span className="text-xs font-bold text-[var(--accent)]">{program.category}</span><span className="muted text-xs">{program.academicYear}학년도 {program.term === "FIRST" ? "1" : "2"}학기</span></div><h2 className="mt-4 text-2xl font-extrabold tracking-[-0.035em]">{program.name}</h2><TranslatedText text={program.description} className="muted mt-3 max-w-3xl leading-7" /></div><div className="md:border-l md:border-[var(--line)] md:pl-5"><p className="muted text-xs leading-6">{date.format(program.startsAt)}–{date.format(program.endsAt)}</p><p className="mt-3 text-sm">주제 {program.topicCount} · 팀 {program.teamCount}</p><Link className="button-quiet mt-4 min-h-9 px-0 text-[var(--accent)]" href={`/topics?programId=${encodeURIComponent(program.id)}`}>주제 보기 →</Link></div></li>)}</ol>}
  </main></AppShell>;
}
