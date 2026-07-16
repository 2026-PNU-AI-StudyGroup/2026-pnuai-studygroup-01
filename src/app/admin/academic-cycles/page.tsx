import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AcademicCycleForm } from "@/app/admin/academic-cycles/academic-cycle-form";
import { ListAcademicCyclesService } from "@/modules/academic-cycle/application/list-academic-cycles";
import { PrismaAcademicCycleRepository } from "@/modules/academic-cycle/infrastructure/prisma-academic-cycle-repository";
import { getCurrentActor } from "@/modules/identity/infrastructure/current-actor";
import { prisma } from "@/shared/infrastructure/database/prisma";
import { AppShell } from "@/shared/ui/app-shell";
import { EmptyState, PageHeader, StatusBadge } from "@/shared/ui/page-primitives";

export const metadata: Metadata = { title: "학기 관리" };

export default async function AcademicCyclesPage() {
  const actor = await getCurrentActor();
  if (!actor) redirect("/sign-in");
  if (actor.role !== "ADMIN") redirect("/");
  const repository = new PrismaAcademicCycleRepository(prisma);
  const cycles = await new ListAcademicCyclesService(repository).execute();
  return (
    <AppShell role={actor.role} userId={actor.id} userName={actor.name} currentPath="/admin/academic-cycles">
      <main className="content-shell space-y-12">
        <PageHeader eyebrow="운영 관리" title="학기 관리" description="주제와 팀 운영의 기준이 되는 학년도·학기를 등록합니다." />
        <section aria-labelledby="cycle-create-title"><h2 id="cycle-create-title" className="mb-5 text-lg font-bold">새 학기 등록</h2><AcademicCycleForm /></section>
        <section aria-labelledby="cycle-list-title"><div className="flex items-end justify-between border-b border-[var(--line)] pb-4"><h2 id="cycle-list-title" className="text-lg font-bold">등록된 학기</h2><span className="muted text-sm">총 {cycles.length}개</span></div>{cycles.length === 0 ? <div className="mt-6"><EmptyState title="등록된 학기가 없습니다" description="위 양식에서 첫 운영 학기를 등록하세요." /></div> : <ol className="divide-y divide-[var(--line)]">{cycles.map((cycle) => <li key={cycle.id} className="flex items-center justify-between gap-4 py-5"><span className="font-bold">{cycle.academicYear}학년도 {cycle.term === "FIRST" ? "1" : "2"}학기</span><StatusBadge>운영 기준</StatusBadge></li>)}</ol>}</section>
      </main>
    </AppShell>
  );
}
