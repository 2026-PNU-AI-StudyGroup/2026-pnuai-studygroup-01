import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ProgramStatusForm } from "@/app/admin/programs/_components/program-status-form";
import { AdminWorkspace } from "@/app/admin/_components/admin-workspace";
import { ListAcademicCyclesService } from "@/modules/academic-cycle/application/list-academic-cycles";
import { PrismaAcademicCycleRepository } from "@/modules/academic-cycle/infrastructure/prisma-academic-cycle-repository";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { ProjectProgramService } from "@/modules/project-program/application/manage-project-programs";
import { PrismaProjectProgramRepository } from "@/modules/project-program/infrastructure/prisma-project-program-repository";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/app/_components/app-shell";
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
      <AdminWorkspace currentPath="/admin/programs" title="프로그램" description="캡스톤과 대회, 교육 프로그램의 운영 기간과 공개 상태를 설정합니다." actions={cycles.length ? <Link className="button-primary" href="/admin/programs/new">새 프로그램</Link> : <Link className="button-secondary" href="/admin/academic-cycles">학기 먼저 설정</Link>}>
        {programs.length === 0 ? (
          <EmptyState title="아직 만든 프로그램이 없습니다" description={cycles.length ? "첫 프로그램을 만들어 프로젝트 운영을 시작하세요." : "프로그램보다 먼저 운영 학기를 설정해 주세요."} action={cycles.length ? <Link className="button-primary" href="/admin/programs/new">새 프로그램</Link> : <Link className="button-secondary" href="/admin/academic-cycles">학기 설정</Link>} />
        ) : (
          <ol className="divide-y divide-[var(--line)] overflow-hidden rounded-[var(--radius-panel)] border border-[var(--line)] border-t-2 border-t-[var(--ink)] bg-white">
            {programs.map((program) => (
              <li key={program.id} className="record-row grid gap-5 px-5 py-6 sm:grid-cols-[1fr_auto] sm:items-center sm:px-6">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-lg font-extrabold tracking-[-0.02em]">{program.name}</h2>
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
