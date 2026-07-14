import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ProjectProgramService } from "@/modules/project-program/application/manage-project-programs";
import { PrismaProjectProgramRepository } from "@/modules/project-program/infrastructure/prisma-project-program-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/shared/ui/app-shell";
import { EmptyState, PageHeader, StatusBadge } from "@/shared/ui/page-primitives";
import { TranslatedText } from "@/shared/ui/translated-text";
const date = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeZone: "Asia/Seoul" });

export default async function ProgramsPage() {
  const actor = await getCurrentActor(); if (!actor) redirect("/sign-in");
  const programs = await new ProjectProgramService(new PrismaProjectProgramRepository(prisma)).listOpen();
  return <AppShell role={actor.role} userName="부산대학교" currentPath="/programs"><main className="content-shell space-y-10">
    <PageHeader eyebrow="Programs" title="학과 프로젝트 프로그램" description="현재 운영 중인 졸업과제, 대회, 교육 프로그램을 살펴보세요." />
    {programs.length === 0 ? <EmptyState title="공개된 프로그램이 없습니다" description="관리자가 새 프로젝트 프로그램을 공개하면 이곳에 표시됩니다." /> : <ol className="divide-y divide-[var(--line)] border-y border-[var(--line)]">{programs.map((program) => <li key={program.id} className="grid gap-5 py-8 sm:grid-cols-[1fr_auto] sm:items-center"><div><div className="flex flex-wrap gap-3"><StatusBadge>{program.category}</StatusBadge><span className="muted text-sm">{program.academicYear}학년도 {program.term === "FIRST" ? "1" : "2"}학기</span></div><h2 className="mt-4 text-xl font-bold">{program.name}</h2><TranslatedText text={program.description} className="muted mt-2 leading-7" /><p className="muted mt-3 text-xs">{date.format(program.startsAt)}–{date.format(program.endsAt)} · 공개 주제 {program.topicCount} · 팀 {program.teamCount}</p></div><Link className="button-secondary" href={`/topics?programId=${encodeURIComponent(program.id)}`}>주제 보기</Link></li>)}</ol>}
  </main></AppShell>;
}
