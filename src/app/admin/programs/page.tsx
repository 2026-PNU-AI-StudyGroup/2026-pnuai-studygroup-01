import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ProgramStatusForm } from "@/app/admin/programs/program-forms";
import { AdminWorkspace } from "@/app/admin/admin-workspace";
import { ListAcademicCyclesService } from "@/modules/academic-cycle/application/list-academic-cycles";
import { PrismaAcademicCycleRepository } from "@/modules/academic-cycle/infrastructure/prisma-academic-cycle-repository";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ProjectProgramService } from "@/modules/project-program/application/manage-project-programs";
import { PrismaProjectProgramRepository } from "@/modules/project-program/infrastructure/prisma-project-program-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/shared/ui/app-shell";
import { EmptyState, StatusBadge } from "@/shared/ui/page-primitives";

export const metadata: Metadata = { title: "프로그램 관리" };
const status = { DRAFT: ["초안", "neutral"], OPEN: ["공개", "info"], CLOSED: ["마감", "neutral"] } as const;
const date = new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeZone: "Asia/Seoul" });

export default async function ProgramsAdminPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "ADMIN") redirect("/topics");
  const [cycles, programs] = await Promise.all([
    new ListAcademicCyclesService(new PrismaAcademicCycleRepository(prisma)).execute(),
    new ProjectProgramService(new PrismaProjectProgramRepository(prisma)).listAll(actor),
  ]);
  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/admin/programs">
      <AdminWorkspace currentPath="/admin/programs" title="프로젝트 프로그램" description="캡스톤, 교내외 프로젝트와 교육 프로그램의 개설 기간과 공개 상태를 관리합니다." actions={cycles.length ? <Link className="button-primary" href="/admin/programs/new">새 프로그램 등록</Link> : <Link className="button-secondary" href="/admin/academic-cycles">학기 먼저 등록</Link>}>
        {programs.length === 0 ? (
          <EmptyState title="등록된 프로그램이 없습니다" description={cycles.length ? "새 프로그램 등록에서 첫 운영 프로그램을 개설하세요." : "프로그램을 만들기 전에 운영 학기를 등록해 주세요."} action={cycles.length ? <Link className="button-primary" href="/admin/programs/new">새 프로그램 등록</Link> : <Link className="button-secondary" href="/admin/academic-cycles">학기 등록</Link>} />
        ) : (
          <ol className="divide-y divide-[var(--line)] border-y-2 border-[var(--ink)]">
            {programs.map((program) => (
              <li key={program.id} className="grid gap-4 py-6 sm:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="font-bold">{program.name}</h2>
                    <StatusBadge tone={status[program.status][1]}>{status[program.status][0]}</StatusBadge>
                  </div>
                  <p className="muted mt-1 text-sm">{program.category} · {program.academicYear}학년도 {program.term === "FIRST" ? "1" : "2"}학기</p>
                  <p className="mt-2 text-sm">{program.description}</p>
                  <p className="muted mt-2 text-xs">{date.format(program.startsAt)} – {date.format(program.endsAt)} · 공개 주제 {program.topicCount}개 · 팀 {program.teamCount}개</p>
                </div>
                <ProgramStatusForm id={program.id} status={program.status} />
              </li>
            ))}
          </ol>
        )}
      </AdminWorkspace>
    </AppShell>
  );
}
